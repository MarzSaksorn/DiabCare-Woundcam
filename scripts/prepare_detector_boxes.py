#!/usr/bin/env python3
"""Prepare a YOLO detector copy from a Roboflow export.

Roboflow can export polygon rows even when the downstream task is detection.
This script preserves the source archive and writes a separate private copy in
which polygon rows are converted to their tight normalized bounding boxes.
Existing five-field bounding-box rows are preserved.
"""
from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
import shutil
from typing import Any

import yaml

from train_detector import EXPECTED_NAMES, IMAGE_EXTENSIONS, audit_split, load_data_yaml, resolve_split_path


def labels_directory(image_directory: Path) -> Path:
    if image_directory.name == "images":
        return image_directory.parent / "labels"
    candidate = image_directory.parent / "labels"
    if candidate.is_dir():
        return candidate
    raise ValueError(f"cannot infer labels directory beside {image_directory}")


def convert_row(raw: str, source: Path, line_number: int) -> tuple[str, str]:
    fields = raw.split()
    if not fields:
        return "", "empty"
    try:
        values = list(map(float, fields))
    except ValueError as exc:
        raise ValueError(f"{source}:{line_number}: non-numeric annotation") from exc
    class_id = values[0]
    if class_id != int(class_id) or not 0 <= int(class_id) < len(EXPECTED_NAMES):
        raise ValueError(f"{source}:{line_number}: class id outside 0..{len(EXPECTED_NAMES) - 1}")
    coordinates = values[1:]
    if len(coordinates) == 4:
        x_center, y_center, width, height = coordinates
        if not all(0 <= value <= 1 for value in coordinates) or width <= 0 or height <= 0:
            raise ValueError(f"{source}:{line_number}: invalid normalized bounding box")
        return " ".join(f"{value:.10g}" for value in values), "bbox"
    if len(coordinates) < 6 or len(coordinates) % 2:
        raise ValueError(f"{source}:{line_number}: expected four bbox coordinates or polygon coordinate pairs")
    if not all(0 <= value <= 1 for value in coordinates):
        raise ValueError(f"{source}:{line_number}: polygon coordinate outside 0..1")
    x_values = coordinates[0::2]
    y_values = coordinates[1::2]
    x_min, x_max = min(x_values), max(x_values)
    y_min, y_max = min(y_values), max(y_values)
    width = x_max - x_min
    height = y_max - y_min
    if width <= 0 or height <= 0:
        raise ValueError(f"{source}:{line_number}: degenerate polygon")
    bbox = [class_id, (x_min + x_max) / 2, (y_min + y_max) / 2, width, height]
    return " ".join(f"{value:.10g}" for value in bbox), "polygon_to_bbox"


def copy_split(split: str, source_images: Path, output_root: Path) -> dict[str, int]:
    source_labels = labels_directory(source_images)
    output_images = output_root / split / "images"
    output_labels = output_root / split / "labels"
    output_images.mkdir(parents=True, exist_ok=True)
    output_labels.mkdir(parents=True, exist_ok=True)
    counters: Counter[str] = Counter()
    images = sorted(path for path in source_images.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)
    if not images:
        raise ValueError(f"{split}: no images found in {source_images}")
    for image in images:
        source_label = source_labels / f"{image.stem}.txt"
        if not source_label.exists():
            raise ValueError(f"{split}: missing label for {image.name}")
        output_lines: list[str] = []
        for line_number, raw in enumerate(source_label.read_text(encoding="utf-8").splitlines(), start=1):
            converted, kind = convert_row(raw.strip(), source_label, line_number)
            if converted:
                output_lines.append(converted)
                counters[kind] += 1
        shutil.copy2(image, output_images / image.name)
        (output_labels / source_label.name).write_text("\n".join(output_lines) + ("\n" if output_lines else ""), encoding="utf-8")
        counters["images"] += 1
    return dict(counters)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--data", type=Path, default=None, help="source data.yaml; defaults to source-root/data.yaml")
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_root = args.source_root.resolve()
    data_yaml = (args.data or source_root / "data.yaml").resolve()
    output_root = args.output_root.resolve()
    if not source_root.is_dir():
        raise ValueError(f"source root does not exist: {source_root}")
    if output_root.exists() and any(output_root.iterdir()) and not args.overwrite:
        raise ValueError(f"output root is not empty; pass --overwrite to replace it: {output_root}")
    if args.overwrite and output_root.exists():
        shutil.rmtree(output_root)
    data = load_data_yaml(data_yaml)
    output_root.mkdir(parents=True, exist_ok=True)
    split_summary: dict[str, Any] = {}
    for split in ("train", "val", "test"):
        if split not in data:
            if split == "test":
                continue
            raise ValueError(f"source data.yaml is missing {split}")
        source_images = resolve_split_path(data[split], data_yaml, source_root)
        source_split = "valid" if split == "val" else split
        split_summary[source_split] = copy_split(source_split, source_images, output_root)
    output_data = {
        "train": "train/images",
        "val": "valid/images",
        "nc": len(EXPECTED_NAMES),
        "names": EXPECTED_NAMES,
        "source_data_yaml": str(data_yaml),
    }
    if "test" in data:
        output_data["test"] = "test/images"
    (output_root / "data.yaml").write_text(yaml.safe_dump(output_data, sort_keys=False), encoding="utf-8")
    audit = {split: audit_split(split, output_root / split / "images") for split in ("train", "valid", "test") if (output_root / split / "images").is_dir()}
    manifest = {
        "source_root": str(source_root),
        "source_data_yaml": str(data_yaml),
        "output_root": str(output_root),
        "classes": EXPECTED_NAMES,
        "conversion": "polygon rows converted to tight normalized bounding boxes; existing bbox rows preserved",
        "split_conversion_counts": split_summary,
        "output_audit": audit,
        "patient_grouping_verified": False,
        "warning": "Research prototype only. Source split is not proven patient-leakage-safe.",
    }
    (output_root / "conversion-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, yaml.YAMLError) as exc:
        print(f"ERROR: {exc}")
        raise SystemExit(2)
