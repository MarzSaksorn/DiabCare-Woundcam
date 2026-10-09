#!/usr/bin/env python3
"""Validate numerical parity between the AZH PyTorch and ONNX classifiers."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import numpy as np
import onnxruntime as ort
import torch

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from train_prototype import SmallClassifier, load_rgb  # noqa: E402

EXPECTED_CLASSES = ["BG", "D", "N", "P", "S", "V"]
IMAGE_SIZE = 128


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--onnx", required=True, type=Path)
    parser.add_argument("--fixture", action="append", type=Path, default=[])
    parser.add_argument("--tolerance", type=float, default=1e-4)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    checkpoint = torch.load(args.checkpoint.resolve(), map_location="cpu", weights_only=True)
    class_names = list(checkpoint.get("class_names", EXPECTED_CLASSES))
    if class_names != EXPECTED_CLASSES:
        raise SystemExit(f"unexpected classifier class order: {class_names!r}")
    model = SmallClassifier(len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    torch.manual_seed(42)
    batches = [
        torch.zeros(2, 3, IMAGE_SIZE, IMAGE_SIZE, dtype=torch.float32),
        torch.rand(2, 3, IMAGE_SIZE, IMAGE_SIZE, dtype=torch.float32),
    ]
    for fixture in args.fixture:
        batches.append(load_rgb(fixture.resolve(), IMAGE_SIZE).unsqueeze(0))
    inputs = torch.cat(batches, dim=0).numpy()

    with torch.no_grad():
        torch_logits = model(torch.from_numpy(inputs)).numpy()
    session = ort.InferenceSession(str(args.onnx.resolve()), providers=["CPUExecutionProvider"])
    onnx_logits = session.run(["logits"], {"images": inputs})[0]
    if torch_logits.shape != onnx_logits.shape:
        raise SystemExit(f"shape mismatch: torch={torch_logits.shape} onnx={onnx_logits.shape}")
    difference = np.abs(torch_logits - onnx_logits)
    max_abs = float(difference.max())
    mean_abs = float(difference.mean())
    result = {
        "fixtures": int(inputs.shape[0]),
        "shape": list(torch_logits.shape),
        "max_abs_logit_difference": max_abs,
        "mean_abs_logit_difference": mean_abs,
        "tolerance": args.tolerance,
        "passed": max_abs <= args.tolerance,
    }
    print(json.dumps(result, indent=2))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
