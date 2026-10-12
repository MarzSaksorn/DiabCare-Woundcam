#!/usr/bin/env python3
"""Create a contact sheet of wound images, masks, and overlays."""
from __future__ import annotations

import argparse
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
TILE = 224
LABEL_HEIGHT = 28


def pairs(root: Path) -> list[tuple[Path, Path, str]]:
    result: list[tuple[Path, Path, str]] = []
    for split in ("train", "test"):
        image_root = root / split / "images"
        label_root = root / split / "labels"
        for image in sorted(image_root.iterdir()):
            if image.suffix.lower() not in EXTENSIONS:
                continue
            label = label_root / image.name
            if label.exists():
                result.append((image, label, split))
    return result


def make_overlay(image: Image.Image, mask: Image.Image) -> Image.Image:
    image = image.convert("RGB")
    mask = mask.convert("L")
    red = Image.new("RGB", image.size, (220, 38, 38))
    tinted = Image.blend(image, red, 0.45)
    return Image.composite(tinted, image, mask)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--sample", type=int, default=12)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    all_pairs = pairs(args.root.resolve())
    if not all_pairs:
        raise SystemExit("no image/mask pairs found")
    random.Random(args.seed).shuffle(all_pairs)
    selected = all_pairs[: max(1, min(args.sample, len(all_pairs)))]
    sheet = Image.new("RGB", (TILE * 3, (TILE + LABEL_HEIGHT) * len(selected)), "white")
    draw = ImageDraw.Draw(sheet)

    for row, (image_path, mask_path, split) in enumerate(selected):
        with Image.open(image_path) as source, Image.open(mask_path) as mask:
            image = source.convert("RGB").resize((TILE, TILE), Image.Resampling.LANCZOS)
            mask_rgb = mask.convert("L").resize((TILE, TILE), Image.Resampling.NEAREST)
            mask_display = Image.new("RGB", (TILE, TILE), (20, 20, 20))
            mask_display.paste((245, 90, 60), mask=mask_rgb)
            overlay = make_overlay(image, mask_rgb)
        x = 0
        y = row * (TILE + LABEL_HEIGHT)
        sheet.paste(image, (x, y)); draw.text((x + 6, y + TILE + 5), f"{split} image", fill="black")
        x += TILE
        sheet.paste(mask_display, (x, y)); draw.text((x + 6, y + TILE + 5), "ground-truth mask", fill="black")
        x += TILE
        sheet.paste(overlay, (x, y)); draw.text((x + 6, y + TILE + 5), "overlay", fill="black")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)
    print(f"wrote {args.output.resolve()} from {len(selected)} pairs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
