#!/usr/bin/env python3
"""Export the binary wound-area SmallUNet checkpoint for the Node ONNX runtime.

This exporter intentionally does not load or write clinical images. It writes an
ONNX artifact and metadata only; parity validation must pass before the files are
copied into the runtime model directory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

import torch

sys.path.insert(0, str(Path(__file__).resolve().parent))
from train_prototype import SmallUNet  # noqa: E402

IMAGE_SIZE = 128
OPSET = 17
EXPORTER_VERSION = "wound-segmentation-export-1"
DEFAULT_CHECKPOINT = Path("server/models/Training/diabcare-wound-segmentation-kit/wound-segmentation-kit/artifacts/wound-segmentation-xpu/best.pt")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_checkpoint(path: Path) -> tuple[SmallUNet, dict]:
    checkpoint = torch.load(path, map_location="cpu", weights_only=True)
    if not isinstance(checkpoint, dict):
        raise RuntimeError("segmentation checkpoint must be a mapping")
    state_dict = checkpoint.get("model_state_dict")
    if not isinstance(state_dict, dict):
        raise RuntimeError("segmentation checkpoint is missing model_state_dict")
    normalized = {key.removeprefix("module."): value for key, value in state_dict.items()}
    model = SmallUNet(1)
    model.load_state_dict(normalized, strict=True)
    model.eval()
    return model, checkpoint


def write_metadata(output_path: Path, checkpoint_path: Path, checkpoint: dict, onnx_path: Path, threshold: float, training_run: str) -> Path:
    metadata_path = output_path / "wound-segmentation.labels.json"
    metadata = {
        "model": "wound-segmentation",
        "version": "wound-segmentation-xpu-best",
        "task": "binary_segmentation",
        "format": "onnx",
        "input": {
            "name": "images",
            "shape": ["batch", 3, IMAGE_SIZE, IMAGE_SIZE],
            "color_order": "RGB",
            "normalization": "pixel / 255",
        },
        "output": {
            "name": "mask_logits",
            "shape": ["batch", 1, IMAGE_SIZE, IMAGE_SIZE],
        },
        "classes": ["background", "wound"],
        "threshold": threshold,
        "clinical_use": False,
        "exporter_version": EXPORTER_VERSION,
        "opset": OPSET,
        "training_run": training_run,
        "checkpoint_epoch": checkpoint.get("epoch"),
        "source_checkpoint": str(checkpoint_path),
        "source_checkpoint_sha256": sha256_file(checkpoint_path),
        "onnx_sha256": sha256_file(onnx_path),
        "source_split_mode": "native_source_split_not_patient_safe",
        "patient_group_id_available": False,
        "parity_validation": {"status": "pending", "validator": "scripts/validate_wound_segmentation_onnx.py"},
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return metadata_path


def export(checkpoint_path: Path, output_dir: Path, threshold: float, training_run: str) -> tuple[Path, Path]:
    if not checkpoint_path.is_file():
        raise FileNotFoundError(f"segmentation checkpoint not found: {checkpoint_path}")
    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1")
    output_dir.mkdir(parents=True, exist_ok=True)
    model, checkpoint = load_checkpoint(checkpoint_path)
    onnx_path = output_dir / "wound-segmentation.onnx"
    example = torch.zeros(1, 3, IMAGE_SIZE, IMAGE_SIZE, dtype=torch.float32)
    with torch.no_grad():
        torch.onnx.export(
            model,
            example,
            onnx_path,
            export_params=True,
            opset_version=OPSET,
            do_constant_folding=True,
            input_names=["images"],
            output_names=["mask_logits"],
            dynamic_axes={"images": {0: "batch"}, "mask_logits": {0: "batch"}},
            dynamo=False,
        )
    metadata_path = write_metadata(output_dir, checkpoint_path, checkpoint, onnx_path, threshold, training_run)
    print(json.dumps({"onnx": str(onnx_path), "metadata": str(metadata_path), "onnx_sha256": sha256_file(onnx_path)}, indent=2))
    return onnx_path, metadata_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    parser.add_argument("--output-dir", type=Path, default=Path("server/models"))
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--training-run", default="wound-segmentation-xpu")
    args = parser.parse_args()
    try:
        export(args.checkpoint, args.output_dir, args.threshold, args.training_run)
    except (FileNotFoundError, RuntimeError, ValueError) as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
