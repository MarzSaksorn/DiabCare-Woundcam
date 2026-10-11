#!/usr/bin/env python3
"""Compare a SmallUNet checkpoint with its ONNX wound-segmentation export."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
import onnxruntime as ort
import torch

sys.path.insert(0, str(Path(__file__).resolve().parent))
from train_prototype import SmallUNet  # noqa: E402

IMAGE_SIZE = 128
DEFAULT_TOLERANCE = 1e-4
VALIDATOR_VERSION = "wound-segmentation-parity-1"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_model(checkpoint_path: Path) -> SmallUNet:
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    if not isinstance(checkpoint, dict) or not isinstance(checkpoint.get("model_state_dict"), dict):
        raise RuntimeError("segmentation checkpoint is missing model_state_dict")
    model = SmallUNet(1)
    state_dict = {key.removeprefix("module."): value for key, value in checkpoint["model_state_dict"].items()}
    model.load_state_dict(state_dict, strict=True)
    model.eval()
    return model


def fixtures() -> list[np.ndarray]:
    generator = torch.Generator().manual_seed(20261011)
    rows: list[np.ndarray] = [
        np.zeros((1, 3, IMAGE_SIZE, IMAGE_SIZE), dtype=np.float32),
        np.ones((1, 3, IMAGE_SIZE, IMAGE_SIZE), dtype=np.float32),
        np.full((1, 3, IMAGE_SIZE, IMAGE_SIZE), 0.5, dtype=np.float32),
    ]
    y = np.linspace(0, 1, IMAGE_SIZE, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, IMAGE_SIZE, dtype=np.float32)[None, :]
    rows.append(np.stack([np.broadcast_to(x, (IMAGE_SIZE, IMAGE_SIZE)), np.broadcast_to(y, (IMAGE_SIZE, IMAGE_SIZE)), np.broadcast_to((x + y) / 2, (IMAGE_SIZE, IMAGE_SIZE))])[None, ...])
    checker = ((np.indices((IMAGE_SIZE, IMAGE_SIZE)).sum(axis=0) % 2) * 1.0).astype(np.float32)
    rows.append(np.stack([checker, 1 - checker, checker])[None, ...])
    rows.append(np.stack([np.broadcast_to(x, (IMAGE_SIZE, IMAGE_SIZE)), np.broadcast_to(1 - x, (IMAGE_SIZE, IMAGE_SIZE)), np.broadcast_to(y, (IMAGE_SIZE, IMAGE_SIZE))])[None, ...])
    rows.append(np.stack([np.broadcast_to(y, (IMAGE_SIZE, IMAGE_SIZE)), np.broadcast_to(x, (IMAGE_SIZE, IMAGE_SIZE)), np.broadcast_to(1 - y, (IMAGE_SIZE, IMAGE_SIZE))])[None, ...])
    rows.append(torch.rand((1, 3, IMAGE_SIZE, IMAGE_SIZE), generator=generator).numpy().astype(np.float32))
    rows.append(torch.rand((1, 3, IMAGE_SIZE, IMAGE_SIZE), generator=generator).numpy().astype(np.float32))
    rows.append(torch.rand((1, 3, IMAGE_SIZE, IMAGE_SIZE), generator=generator).numpy().astype(np.float32))
    rows.append(torch.rand((1, 3, IMAGE_SIZE, IMAGE_SIZE), generator=generator).numpy().astype(np.float32))
    rows.append(torch.rand((1, 3, IMAGE_SIZE, IMAGE_SIZE), generator=generator).numpy().astype(np.float32))
    return rows


def validate(checkpoint_path: Path, onnx_path: Path, metadata_path: Path, report_path: Path, threshold: float, tolerance: float) -> dict:
    model = load_model(checkpoint_path)
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    inputs = session.get_inputs()
    outputs = session.get_outputs()
    if len(inputs) != 1 or inputs[0].name != "images":
        raise RuntimeError("ONNX input contract must expose exactly one tensor named images")
    if len(outputs) != 1 or outputs[0].name != "mask_logits":
        raise RuntimeError("ONNX output contract must expose exactly one tensor named mask_logits")

    max_abs_logit_difference = 0.0
    sum_abs_logit_difference = 0.0
    logit_count = 0
    max_abs_probability_difference = 0.0
    max_abs_coverage_difference = 0.0
    thresholded_masks_match = True
    fixture_count = 0
    with torch.inference_mode():
        for fixture in fixtures():
            fixture_count += 1
            torch_logits = model(torch.from_numpy(fixture)).numpy()
            onnx_logits = session.run(["mask_logits"], {"images": fixture})[0]
            if tuple(onnx_logits.shape) != (1, 1, IMAGE_SIZE, IMAGE_SIZE):
                raise RuntimeError(f"unexpected ONNX output shape: {onnx_logits.shape}")
            difference = np.abs(torch_logits - onnx_logits)
            max_abs_logit_difference = max(max_abs_logit_difference, float(difference.max()))
            sum_abs_logit_difference += float(difference.sum())
            logit_count += difference.size
            torch_probability = 1 / (1 + np.exp(-torch_logits))
            onnx_probability = 1 / (1 + np.exp(-onnx_logits))
            max_abs_probability_difference = max(max_abs_probability_difference, float(np.abs(torch_probability - onnx_probability).max()))
            torch_mask = torch_probability >= threshold
            onnx_mask = onnx_probability >= threshold
            thresholded_masks_match = thresholded_masks_match and bool(np.array_equal(torch_mask, onnx_mask))
            torch_coverage = float(torch_mask.mean())
            onnx_coverage = float(onnx_mask.mean())
            max_abs_coverage_difference = max(max_abs_coverage_difference, abs(torch_coverage - onnx_coverage))

    if max_abs_logit_difference > tolerance or not thresholded_masks_match:
        raise RuntimeError("PyTorch and ONNX segmentation outputs failed parity validation")

    report = {
        "validator": VALIDATOR_VERSION,
        "checkpoint_sha256": sha256_file(checkpoint_path),
        "onnx_sha256": sha256_file(onnx_path),
        "opset": 17,
        "fixtures": fixture_count,
        "max_abs_logit_difference": max_abs_logit_difference,
        "mean_abs_logit_difference": sum_abs_logit_difference / logit_count,
        "max_abs_probability_difference": max_abs_probability_difference,
        "max_abs_coverage_difference": max_abs_coverage_difference,
        "thresholded_masks_match": thresholded_masks_match,
        "threshold": threshold,
        "tolerance": tolerance,
        "passed": True,
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if metadata_path.exists():
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        metadata["parity_validation"] = report
        metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--onnx", type=Path, required=True)
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--tolerance", type=float, default=DEFAULT_TOLERANCE)
    args = parser.parse_args()
    if not 0 <= args.threshold <= 1:
        parser.error("threshold must be between 0 and 1")
    metadata_path = args.metadata or args.onnx.with_name("wound-segmentation.labels.json")
    report_path = args.report or args.onnx.with_name("wound-segmentation.parity.json")
    try:
        validate(args.checkpoint, args.onnx, metadata_path, report_path, args.threshold, args.tolerance)
    except (OSError, RuntimeError, ValueError) as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
