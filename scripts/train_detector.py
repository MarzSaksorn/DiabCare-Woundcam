#!/usr/bin/env python3
"""Fine-tune the Roboflow Ultralytics detector after validating its dataset.

This entry point is deliberately prototype-only. It requires an explicit
source-split opt-in because the Roboflow export is not assumed to contain
patient- or wound-group identifiers.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from typing import Any

import yaml
from ultralytics import YOLO

EXPECTED_NAMES = [
    "callus_corn",
    "dfu_ulcer",
    "infected_wound",
    "necrotic_wound",
    "normal_foot",
]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


class DetectorDataError(RuntimeError):
    """Raised when the detector dataset does not meet the expected schema."""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_data_yaml(path: Path) -> dict[str, Any]:
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise DetectorDataError(f"invalid dataset YAML {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise DetectorDataError(f"dataset YAML must contain a mapping: {path}")
    names = data.get("names")
    if isinstance(names, dict):
        ordered_names = [names[index] for index in sorted(names, key=lambda value: int(value))]
    elif isinstance(names, list):
        ordered_names = names
    else:
        raise DetectorDataError("dataset YAML must define names as a list or numeric-keyed mapping")
    if ordered_names != EXPECTED_NAMES:
        raise DetectorDataError(f"class order must be {EXPECTED_NAMES!r}; found {ordered_names!r}")
    if data.get("nc", len(ordered_names)) != len(EXPECTED_NAMES):
        raise DetectorDataError(f"dataset YAML nc must be {len(EXPECTED_NAMES)}")
    return data


def resolve_split_path(value: str | Path, data_yaml: Path, root: Path | None) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path.resolve()
    bases = [root] if root is not None else []
    bases.append(data_yaml.parent)
    candidates = [(base / path).resolve() for base in bases]
    # Roboflow exports sometimes keep data.yaml beside train/valid/test but
    # retain ../ prefixes from the source project layout.
    if path.parts and path.parts[0] == "..":
        stripped = Path(*path.parts[1:])
        candidates.extend((base / stripped).resolve() for base in bases)
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def image_files(directory: Path) -> list[Path]:
    return sorted(path for path in directory.glob("*") if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)


def label_directory(image_directory: Path) -> Path:
    if image_directory.name == "images":
        return image_directory.parent / "labels"
    candidate = image_directory.parent / "labels"
    if candidate.exists():
        return candidate
    raise DetectorDataError(f"cannot infer YOLO labels directory beside {image_directory}")


def audit_split(split: str, image_directory: Path) -> dict[str, int | str]:
    if not image_directory.is_dir():
        raise DetectorDataError(f"{split} image directory does not exist: {image_directory}")
    labels = label_directory(image_directory)
    if not labels.is_dir():
        raise DetectorDataError(f"{split} labels directory does not exist: {labels}")
    images = image_files(image_directory)
    if not images:
        raise DetectorDataError(f"{split} image directory is empty: {image_directory}")
    missing_labels: list[str] = []
    invalid_rows: list[str] = []
    object_count = 0
    bbox_count = 0
    polygon_count = 0
    for image in images:
        label = labels / f"{image.stem}.txt"
        if not label.exists():
            missing_labels.append(image.name)
            continue
        for line_number, raw_line in enumerate(label.read_text(encoding="utf-8").splitlines(), start=1):
            line = raw_line.strip()
            if not line:
                continue
            fields = line.split()
            if len(fields) == 5:
                row_kind = "bbox"
            elif len(fields) >= 7 and len(fields) % 2 == 1:
                row_kind = "polygon"
            else:
                invalid_rows.append(f"{label}:{line_number}")
                continue
            try:
                values = list(map(float, fields))
            except ValueError:
                invalid_rows.append(f"{label}:{line_number}")
                continue
            class_id = values[0]
            if class_id != int(class_id) or not 0 <= int(class_id) < len(EXPECTED_NAMES):
                invalid_rows.append(f"{label}:{line_number}")
                continue
            coordinates = values[1:]
            if not all(0 <= value <= 1 for value in coordinates):
                invalid_rows.append(f"{label}:{line_number}")
                continue
            if row_kind == "bbox":
                _, _, width, height = coordinates
                if width <= 0 or height <= 0:
                    invalid_rows.append(f"{label}:{line_number}")
                    continue
                bbox_count += 1
            else:
                x_values = coordinates[0::2]
                y_values = coordinates[1::2]
                if len(x_values) < 3 or max(x_values) <= min(x_values) or max(y_values) <= min(y_values):
                    invalid_rows.append(f"{label}:{line_number}")
                    continue
                polygon_count += 1
            object_count += 1
    if missing_labels:
        raise DetectorDataError(f"{split}: {len(missing_labels)} images have no label file; examples: {missing_labels[:5]}")
    if invalid_rows:
        raise DetectorDataError(f"{split}: {len(invalid_rows)} invalid YOLO label rows; examples: {invalid_rows[:5]}")
    return {
        "images": len(images),
        "objects": object_count,
        "bbox_rows": bbox_count,
        "polygon_rows": polygon_count,
        "image_dir": str(image_directory),
        "label_dir": str(labels),
    }


def audit_dataset(data_yaml_path: Path, data: dict[str, Any], root: Path | None) -> dict[str, Any]:
    summaries: dict[str, Any] = {}
    for split in ("train", "val", "test"):
        if split in data:
            split_path = resolve_split_path(data[split], data_yaml_path, root)
            summaries[split] = audit_split(split, split_path)
    for required in ("train", "val"):
        if required not in summaries:
            raise DetectorDataError(f"dataset YAML must define a {required} split")
    return summaries


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--weights", required=True, type=Path, help="Ultralytics .pt checkpoint")
    parser.add_argument("--data", required=True, type=Path, help="Roboflow YOLO data.yaml")
    parser.add_argument("--output", required=True, type=Path, help="Private directory for the training run")
    parser.add_argument("--name", default="roboflow-detector-finetune")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--dataset-root", type=Path, default=None)
    parser.add_argument("--resume", action="store_true", help="resume a full Ultralytics last.pt run; do not use for a best-only checkpoint")
    parser.add_argument("--allow-source-split", action="store_true", help="explicitly allow training without verified patient/wound groups")
    parser.add_argument("--dry-run", action="store_true", help="validate the YAML and labels without training")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.allow_source_split:
        raise DetectorDataError("detector training requires --allow-source-split because patient/wound grouping is not verified")
    if args.epochs < 1 or args.batch < 1 or args.imgsz < 32:
        raise DetectorDataError("epochs, batch, and imgsz must be positive; imgsz must be at least 32")
    weights = args.weights.resolve()
    data_yaml = args.data.resolve()
    output = args.output.resolve()
    if not weights.exists():
        raise DetectorDataError(f"weights checkpoint does not exist: {weights}")
    if not data_yaml.exists():
        raise DetectorDataError(f"dataset YAML does not exist: {data_yaml}")
    data = load_data_yaml(data_yaml)
    split_summary = audit_dataset(data_yaml, data, args.dataset_root.resolve() if args.dataset_root else None)
    plan = {
        "weights": str(weights),
        "weights_sha256": sha256(weights),
        "data_yaml": str(data_yaml),
        "data_yaml_sha256": sha256(data_yaml),
        "classes": EXPECTED_NAMES,
        "splits": split_summary,
        "epochs": args.epochs,
        "imgsz": args.imgsz,
        "batch": args.batch,
        "device": args.device,
        "seed": args.seed,
        "resume": args.resume,
        "patient_grouping_verified": False,
        "clinical_use": False,
        "warning": "Research prototype only. Source split is not proven patient-leakage-safe.",
    }
    print(json.dumps(plan, indent=2, sort_keys=True))
    if args.dry_run:
        print("DRY RUN: dataset validation passed; no training started.")
        return 0

    output.mkdir(parents=True, exist_ok=True)
    model = YOLO(str(weights))
    results = model.train(
        data=str(data_yaml),
        project=str(output),
        name=args.name,
        exist_ok=args.resume,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        workers=args.workers,
        device=args.device,
        seed=args.seed,
        deterministic=True,
        resume=args.resume,
        verbose=True,
    )
    run_dir = Path(getattr(results, "save_dir", output / args.name)).resolve()
    run_dir.mkdir(parents=True, exist_ok=True)
    plan.update({
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "run_dir": str(run_dir),
        "result": str(results),
    })
    (run_dir / "training-manifest.json").write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"run_dir": str(run_dir), "training_manifest": str(run_dir / "training-manifest.json")}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except DetectorDataError as exc:
        print(f"ERROR: {exc}")
        raise SystemExit(2)
