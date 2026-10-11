#!/usr/bin/env python3
"""Run a binary wound-area checkpoint on one image and save visual outputs."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from PIL import Image

from train_prototype import SmallUNet, load_rgb


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True, help="overlay image path")
    parser.add_argument("--mask-output", type=Path, default=None)
    parser.add_argument("--image-size", type=int, default=128)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--device", default="cpu")
    args = parser.parse_args()
    if not 0.0 < args.threshold < 1.0:
        raise SystemExit("--threshold must be between 0 and 1")

    device = torch.device(args.device)
    checkpoint = torch.load(args.checkpoint, map_location=device, weights_only=True)
    classes = int(checkpoint.get("classes", 1))
    if classes != 1:
        raise SystemExit(f"checkpoint has {classes} classes; expected binary wound segmentation")
    model = SmallUNet(classes=1).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    with Image.open(args.image) as source:
        original = source.convert("RGB")
    tensor = load_rgb(args.image, args.image_size).unsqueeze(0).to(device)
    with torch.no_grad():
        probability = torch.sigmoid(model(tensor))[0, 0].cpu().numpy()
    mask_small = (probability >= args.threshold).astype(np.uint8) * 255
    mask = Image.fromarray(mask_small, mode="L").resize(original.size, Image.Resampling.NEAREST)

    red = Image.new("RGB", original.size, (220, 38, 38))
    tinted = Image.blend(original, red, 0.45)
    overlay = Image.composite(tinted, original, mask)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    overlay.save(args.output)

    mask_output = args.mask_output or args.output.with_name(f"{args.output.stem}.mask.png")
    mask_output.parent.mkdir(parents=True, exist_ok=True)
    mask.save(mask_output)

    mask_array = np.asarray(mask) > 0
    metadata_path = args.output.with_suffix(".json")
    metadata = {
        "task": "binary_wound_area_segmentation",
        "checkpoint": str(args.checkpoint.resolve()),
        "image": str(args.image.resolve()),
        "overlay": str(args.output.resolve()),
        "mask": str(mask_output.resolve()),
        "input_size": args.image_size,
        "threshold": args.threshold,
        "original_size": [original.width, original.height],
        "predicted_wound_pixel_fraction": float(mask_array.mean()),
        "warning": "Pixel fraction is not a physical area measurement and this output is not a diagnosis.",
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
