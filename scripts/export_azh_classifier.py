#!/usr/bin/env python3
"""Export the existing AZH classifier checkpoint to ONNX with auditable metadata."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import onnx
import torch

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from train_prototype import AZH_CLASS_LABELS, SmallClassifier  # noqa: E402

EXPECTED_CLASSES = ["BG", "D", "N", "P", "S", "V"]
IMAGE_SIZE = 128


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--metadata", required=True, type=Path)
    parser.add_argument("--opset", type=int, default=17)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    checkpoint_path = args.checkpoint.resolve()
    output_path = args.output.resolve()
    metadata_path = args.metadata.resolve()
    if not checkpoint_path.exists():
        raise SystemExit(f"checkpoint does not exist: {checkpoint_path}")

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    class_names = list(checkpoint.get("class_names", EXPECTED_CLASSES))
    if class_names != EXPECTED_CLASSES:
        raise SystemExit(f"unexpected classifier class order: {class_names!r}")
    label_map = checkpoint.get("class_label_map", {name: AZH_CLASS_LABELS[name] for name in class_names})
    if label_map != {name: AZH_CLASS_LABELS[name] for name in EXPECTED_CLASSES}:
        raise SystemExit("checkpoint label map does not match the verified AZH mapping")

    model = SmallClassifier(len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    dummy = torch.zeros(1, 3, IMAGE_SIZE, IMAGE_SIZE, dtype=torch.float32)
    torch.onnx.export(
        model,
        (dummy,),
        str(output_path),
        input_names=["images"],
        output_names=["logits"],
        dynamic_axes={"images": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=args.opset,
        do_constant_folding=True,
        dynamo=False,
    )
    exported = onnx.load(str(output_path))
    onnx.checker.check_model(exported)
    input_shape = [dimension.dim_value if dimension.dim_value else str(dimension.dim_param) for dimension in exported.graph.input[0].type.tensor_type.shape.dim]
    output_shape = [dimension.dim_value if dimension.dim_value else str(dimension.dim_param) for dimension in exported.graph.output[0].type.tensor_type.shape.dim]
    metadata = {
        "model": "azh-classifier",
        "task": "classification",
        "format": "onnx",
        "opset": args.opset,
        "input": {
            "name": "images",
            "shape": input_shape,
            "color_order": "RGB",
            "normalization": "pixel / 255",
        },
        "output": {"name": "logits", "shape": output_shape},
        "classes": class_names,
        "class_label_map": label_map,
        "checkpoint_epoch": checkpoint.get("epoch"),
        "checkpoint_sha256": sha256(checkpoint_path),
        "onnx_sha256": sha256(output_path),
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "source_dataset": "AZH",
        "source_split_mode": "native_source_split_not_patient_safe",
        "patient_group_id_available": False,
        "clinical_use": False,
        "disclaimer": "Research prototype. Source split is not patient-leakage-safe and output is not a medical diagnosis.",
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"onnx": str(output_path), "metadata": str(metadata_path), "metadata_summary": metadata}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
