#!/usr/bin/env python3
"""Validate a binary wound-segmentation image/mask dataset before training."""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_files(path: Path) -> list[Path]:
    return sorted(item for item in path.iterdir() if item.is_file() and item.suffix.lower() in IMAGE_EXTENSIONS)


def validate_split(root: Path, split: str) -> dict:
    image_root = root / split / "images"
    mask_root = root / split / "labels"
    if not image_root.is_dir() or not mask_root.is_dir():
        raise SystemExit(f"missing {split}/images or {split}/labels below {root}")

    images = image_files(image_root)
    masks = image_files(mask_root)
    mask_by_stem = {path.stem: path for path in masks}
    missing_masks = [str(path.relative_to(root)) for path in images if path.stem not in mask_by_stem]
    orphan_masks = [str(path.relative_to(root)) for path in masks if path.stem not in {image.stem for image in images}]
    non_binary: dict[str, list[int]] = {}
    empty_masks = 0
    positive_pixels = 0
    total_pixels = 0
    image_shapes: dict[str, list[int]] = {}

    for image in images:
        mask = mask_by_stem.get(image.stem)
        if mask is None:
            continue
        with Image.open(image) as source_image, Image.open(mask) as source_mask:
            image_shapes[image.name] = [source_image.width, source_image.height]
            values = np.unique(np.asarray(source_mask.convert("L")))
            if not set(values.tolist()).issubset({0, 1, 255}):
                non_binary[mask.name] = [int(value) for value in values[:32]]
            mask_array = np.asarray(source_mask.convert("L")) > 0
            total_pixels += int(mask_array.size)
            positive = int(mask_array.sum())
            positive_pixels += positive
            if positive == 0:
                empty_masks += 1

    return {
        "images": len(images),
        "masks": len(masks),
        "missing_masks": missing_masks,
        "orphan_masks": orphan_masks,
        "empty_masks": empty_masks,
        "mask_positive_pixel_fraction": positive_pixels / total_pixels if total_pixels else 0.0,
        "non_binary_masks": non_binary,
        "image_shapes_sample": dict(list(image_shapes.items())[:10]),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    train = validate_split(root, "train")
    test = validate_split(root, "test")

    image_hashes: dict[str, list[str]] = defaultdict(list)
    for split in ("train", "test"):
        for path in image_files(root / split / "images"):
            image_hashes[sha256(path)].append(str(path.relative_to(root)))
    duplicate_groups = [paths for paths in image_hashes.values() if len(paths) > 1]
    report = {
        "root": str(root),
        "task": "binary_wound_area_segmentation",
        "splits": {"train": train, "test": test},
        "exact_duplicate_image_groups": duplicate_groups,
        "patient_group_id_available": False,
        "source_split_warning": "The source archive has no reliable patient or wound grouping IDs; source splits are not patient-leakage-safe.",
        "valid_for_smoke_training": not (
            train["missing_masks"]
            or test["missing_masks"]
            or train["orphan_masks"]
            or test["orphan_masks"]
        ),
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "report": str(args.report.resolve()),
        "train_images": train["images"],
        "test_images": test["images"],
        "duplicate_groups": len(duplicate_groups),
        "valid_for_smoke_training": report["valid_for_smoke_training"],
    }, indent=2))
    return 0 if report["valid_for_smoke_training"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
