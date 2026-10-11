#!/usr/bin/env python3
"""Predict wound masks for a directory while loading the checkpoint once."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from PIL import Image

from train_prototype import SmallUNet, load_rgb

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def choose_device(value: str) -> torch.device:
    if value == "auto":
        if hasattr(torch, "xpu") and torch.xpu.is_available():
            return torch.device("xpu")
        if torch.cuda.is_available():
            return torch.device("cuda")
        return torch.device("cpu")
    device = torch.device(value)
    if device.type == "xpu" and (not hasattr(torch, "xpu") or not torch.xpu.is_available()):
        raise SystemExit("XPU is not available; install the PyTorch XPU build and Intel GPU driver first")
    if device.type == "cuda" and not torch.cuda.is_available():
        raise SystemExit("CUDA is not available; use --device cpu or install a CUDA PyTorch build")
    return device


def output_paths(output_dir: Path, input_dir: Path, image_path: Path) -> tuple[Path, Path, Path]:
    relative = image_path.relative_to(input_dir)
    overlay = output_dir / relative.with_suffix(".overlay.png")
    mask = output_dir / relative.with_name(f"{relative.stem}.overlay.mask.png")
    metadata = output_dir / relative.with_suffix(".overlay.json")
    return overlay, mask, metadata


def write_prediction(
    image_path: Path,
    output_dir: Path,
    input_dir: Path,
    probability: np.ndarray,
    threshold: float,
    checkpoint: Path,
    image_size: int,
) -> None:
    overlay_path, mask_path, metadata_path = output_paths(output_dir, input_dir, image_path)
    with Image.open(image_path) as source:
        original = source.convert("RGB")
    mask_small = (probability >= threshold).astype(np.uint8) * 255
    mask = Image.fromarray(mask_small, mode="L").resize(original.size, Image.Resampling.NEAREST)
    red = Image.new("RGB", original.size, (220, 38, 38))
    tinted = Image.blend(original, red, 0.45)
    overlay = Image.composite(tinted, original, mask)

    overlay_path.parent.mkdir(parents=True, exist_ok=True)
    overlay.save(overlay_path)
    mask.save(mask_path)
    metadata_path.write_text(
        json.dumps(
            {
                "task": "binary_wound_area_segmentation",
                "checkpoint": str(checkpoint.resolve()),
                "image": str(image_path.resolve()),
                "overlay": str(overlay_path.resolve()),
                "mask": str(mask_path.resolve()),
                "input_size": image_size,
                "threshold": threshold,
                "original_size": [original.width, original.height],
                "predicted_wound_pixel_fraction": float((np.asarray(mask) > 0).mean()),
                "warning": "Pixel fraction is not a physical area measurement and this output is not a diagnosis.",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--image-size", type=int, default=128)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--device", default="auto", help="auto, cpu, cuda, or xpu")
    args = parser.parse_args()
    if args.batch_size < 1:
        raise SystemExit("--batch-size must be at least 1")
    if not 0.0 < args.threshold < 1.0:
        raise SystemExit("--threshold must be between 0 and 1")

    checkpoint = args.checkpoint.resolve()
    input_dir = args.input_dir.resolve()
    output_dir = args.output_dir.resolve()
    if not checkpoint.is_file():
        raise SystemExit(f"checkpoint does not exist: {checkpoint}")
    if not input_dir.is_dir():
        raise SystemExit(f"input directory does not exist: {input_dir}")

    image_paths = sorted(path for path in input_dir.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)
    if not image_paths:
        raise SystemExit(f"no supported images found below {input_dir}")

    device = choose_device(args.device)
    checkpoint_data = torch.load(checkpoint, map_location=device, weights_only=True)
    classes = int(checkpoint_data.get("classes", 1))
    if classes != 1:
        raise SystemExit(f"checkpoint has {classes} classes; expected binary wound segmentation")
    model = SmallUNet(classes=1).to(device)
    model.load_state_dict(checkpoint_data["model_state_dict"])
    model.eval()

    print(f"device={device} images={len(image_paths)} batch_size={args.batch_size}", flush=True)
    with torch.inference_mode():
        for start in range(0, len(image_paths), args.batch_size):
            batch_paths = image_paths[start : start + args.batch_size]
            batch = torch.stack([load_rgb(path, args.image_size) for path in batch_paths]).to(device)
            probabilities = torch.sigmoid(model(batch)).squeeze(1).cpu().numpy()
            for image_path, probability in zip(batch_paths, probabilities):
                write_prediction(
                    image_path,
                    output_dir,
                    input_dir,
                    probability,
                    args.threshold,
                    checkpoint,
                    args.image_size,
                )
            print(f"processed={min(start + len(batch_paths), len(image_paths))}/{len(image_paths)}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
