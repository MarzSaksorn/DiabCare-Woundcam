#!/usr/bin/env python3
"""Index native wound datasets and create leakage-safe task manifests.

The script is intentionally conservative. It can index records with unknown
patient groups for audit, but it refuses to create a training split until every
eligible record has an owner-supplied patient_group_id.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import shutil
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

from PIL import Image

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
TASKS = {"detection", "classification", "segmentation"}
REQUIRED_FIELDS = {
    "record_id",
    "source_dataset",
    "source_version",
    "task",
    "image_uri",
    "annotation_uri",
    "label",
    "patient_group_id",
    "wound_group_id",
    "visit_group_id",
    "capture_group_id",
    "sha256",
    "width",
    "height",
    "native_split",
    "split",
    "split_status",
}


class PipelineError(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def image_metadata(path: Path) -> tuple[int, int]:
    try:
        with Image.open(path) as image:
            return image.width, image.height
    except Exception as exc:  # pragma: no cover - error text is more useful to users
        raise PipelineError(f"cannot read image metadata: {path}: {exc}") from exc


def json_value(value: Any) -> Any:
    return value if value not in ("", None) else None


def make_record(
    *,
    record_id: str,
    source_dataset: str,
    source_version: str,
    task: str,
    image_path: Path,
    root: Path,
    annotation_path: Path | None,
    label: str | None,
    native_split: str | None,
    metadata: dict[str, Any] | None = None,
    patient_group_id: str | None = None,
    wound_group_id: str | None = None,
    visit_group_id: str | None = None,
    capture_group_id: str | None = None,
) -> dict[str, Any]:
    if task not in TASKS:
        raise PipelineError(f"unsupported task {task!r} for {record_id}")
    width, height = image_metadata(image_path)
    return {
        "record_id": record_id,
        "source_dataset": source_dataset,
        "source_version": source_version,
        "task": task,
        "image_uri": str(image_path.resolve().relative_to(root.resolve())),
        "annotation_uri": (
            str(annotation_path.resolve().relative_to(root.resolve()))
            if annotation_path
            else None
        ),
        "label": label,
        "patient_group_id": patient_group_id,
        "wound_group_id": wound_group_id,
        "visit_group_id": visit_group_id,
        "capture_group_id": capture_group_id,
        "sha256": sha256_file(image_path),
        "width": width,
        "height": height,
        "native_split": native_split,
        "split": None,
        "split_status": "unassigned",
        "is_exact_duplicate": False,
        "duplicate_group": None,
        "metadata": metadata or {},
    }


def safe_extract(archive: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    destination_resolved = destination.resolve()
    with zipfile.ZipFile(archive) as bundle:
        for member in bundle.infolist():
            target = (destination / member.filename).resolve()
            if destination_resolved not in target.parents and target != destination_resolved:
                raise PipelineError(f"unsafe archive member: {member.filename}")
        bundle.extractall(destination)


def find_image(root: Path, stem: str) -> Path:
    for extension in IMAGE_EXTENSIONS:
        candidate = root / f"{stem}{extension}"
        if candidate.exists():
            return candidate
    matches = list(root.rglob(f"{Path(stem).name}.*"))
    matches = [path for path in matches if path.suffix.lower() in IMAGE_EXTENSIONS]
    if len(matches) == 1:
        return matches[0]
    raise PipelineError(f"could not resolve one image for {stem!r} under {root}")


def index_azh(root: Path, output: Path, source_version: str) -> int:
    rows: list[dict[str, Any]] = []
    for split_name in ("Train", "Test"):
        split_root = root / split_name
        csv_path = split_root / f"wound_locations_Labels_AZH_{split_name}.csv"
        if not csv_path.exists():
            raise PipelineError(f"missing AZH label file: {csv_path}")
        with csv_path.open(newline="", encoding="utf-8-sig") as handle:
            for row in csv.DictReader(handle):
                index = (row.get("index") or "").strip().replace("\\", "/")
                if not index:
                    raise PipelineError(f"empty AZH index in {csv_path}")
                image = find_image(split_root, index)
                folder_label = Path(index).parts[0]
                rows.append(
                    make_record(
                        record_id=f"AZH:{split_name}:{index}",
                        source_dataset="AZH",
                        source_version=source_version,
                        task="classification",
                        image_path=image,
                        root=root,
                        annotation_path=None,
                        label=folder_label,
                        native_split=split_name.lower(),
                        metadata={
                            "source_label": row.get("Labels"),
                            "body_map_location": row.get("Locations"),
                        },
                        patient_group_id=json_value(row.get("patient_id")),
                    )
                )
    write_jsonl(output, rows)
    return len(rows)


def index_dfutissue(root: Path, output: Path, source_version: str) -> int:
    dataset_root = root / "DFUTissue" if (root / "DFUTissue").exists() else root
    image_root = dataset_root / "Labeled" / "Original" / "Images"
    annotation_root = dataset_root / "Labeled" / "Original" / "Annotations"
    if not image_root.exists() or not annotation_root.exists():
        raise PipelineError(f"expected DFUTissue image and annotation roots below {dataset_root}")
    rows: list[dict[str, Any]] = []
    for image in sorted(image_root.rglob("*")):
        if not image.is_file() or image.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        relative = image.relative_to(image_root)
        annotation = annotation_root / relative
        if not annotation.exists():
            raise PipelineError(f"missing DFUTissue mask for {image}")
        native_split = "test" if "Test" in relative.parts else "trainval"
        rows.append(
            make_record(
                record_id=f"DFUTissue:{relative.with_suffix('')}",
                source_dataset="DFUTissue",
                source_version=source_version,
                task="segmentation",
                image_path=image,
                root=root,
                annotation_path=annotation,
                label="tissue_mask",
                native_split=native_split,
                metadata={"mask_encoding": "source-native-palette-png"},
            )
        )
    write_jsonl(output, rows)
    return len(rows)


def write_jsonl(path: Path, records: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, sort_keys=True) + "\n")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise PipelineError(f"invalid JSONL at {path}:{line_number}: {exc}") from exc
            missing = REQUIRED_FIELDS - set(record)
            if missing:
                raise PipelineError(f"{path}:{line_number} missing fields: {sorted(missing)}")
            records.append(record)
    return records


def mark_exact_duplicates(records: list[dict[str, Any]]) -> None:
    by_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        by_hash[record["sha256"]].append(record)
    for digest, matches in by_hash.items():
        if len(matches) < 2:
            continue
        ordered = sorted(matches, key=lambda item: item["record_id"])
        for index, record in enumerate(ordered):
            record["duplicate_group"] = digest
            if index:
                record["is_exact_duplicate"] = True
                record["split_status"] = "quarantined_exact_duplicate"


def assign_group_splits(
    records: list[dict[str, Any]],
    *,
    seed: int,
    train_ratio: float,
    validation_ratio: float,
    test_ratio: float,
    require_patient_groups: bool,
) -> dict[str, Any]:
    total = train_ratio + validation_ratio + test_ratio
    if abs(total - 1.0) > 1e-9:
        raise PipelineError(f"split ratios must sum to 1.0, got {total}")
    mark_exact_duplicates(records)
    eligible = [record for record in records if not record["is_exact_duplicate"]]
    missing = [record["record_id"] for record in eligible if not record.get("patient_group_id")]
    if require_patient_groups and missing:
        sample = ", ".join(missing[:10])
        raise PipelineError(
            f"refusing to split {len(missing)} records without patient_group_id; "
            f"examples: {sample}. Do not derive patient IDs from filenames."
        )
    groups = sorted({record["patient_group_id"] for record in eligible if record.get("patient_group_id")})
    if not groups:
        raise PipelineError("no patient groups available for a training split")
    keyed = sorted(groups, key=lambda group: hashlib.sha256(f"{seed}:{group}".encode()).hexdigest())
    test_count = round(len(keyed) * test_ratio)
    validation_count = round(len(keyed) * validation_ratio)
    assignments = {
        group: "test" if index < test_count else "validation" if index < test_count + validation_count else "train"
        for index, group in enumerate(keyed)
    }
    for record in eligible:
        group = record.get("patient_group_id")
        if not group:
            record["split"] = None
            record["split_status"] = "blocked_missing_patient_group"
        else:
            record["split"] = assignments[group]
            record["split_status"] = "group_safe"
    return {
        "seed": seed,
        "group_count": len(groups),
        "record_count": len(eligible),
        "split_counts": Counter(record["split"] for record in eligible),
        "ratios": {"train": train_ratio, "validation": validation_ratio, "test": test_ratio},
    }


def validate_records(records: list[dict[str, Any]], root: Path, require_patient_groups: bool) -> dict[str, Any]:
    errors: list[str] = []
    task_counts = Counter(record["task"] for record in records)
    source_counts = Counter(record["source_dataset"] for record in records)
    split_groups: dict[str, set[str]] = defaultdict(set)
    for record in records:
        if record["task"] not in TASKS:
            errors.append(f"{record['record_id']}: unsupported task {record['task']}")
        image = root / record["image_uri"] if not str(record["image_uri"]).startswith("s3://") else None
        if image is not None and not image.exists():
            errors.append(f"{record['record_id']}: missing image {image}")
        annotation_uri = record.get("annotation_uri")
        if annotation_uri and not str(annotation_uri).startswith("s3://"):
            annotation = root / annotation_uri
            if not annotation.exists():
                errors.append(f"{record['record_id']}: missing annotation {annotation}")
        if require_patient_groups and not record.get("patient_group_id"):
            errors.append(f"{record['record_id']}: missing patient_group_id")
        if record.get("split") and record.get("patient_group_id"):
            split_groups[record["patient_group_id"]].add(record["split"])
    for group, splits in split_groups.items():
        if len(splits) != 1:
            errors.append(f"patient group {group} appears in multiple splits: {sorted(splits)}")
    duplicate_hashes = Counter(record["sha256"] for record in records)
    duplicate_groups = sum(1 for count in duplicate_hashes.values() if count > 1)
    result = {
        "record_count": len(records),
        "task_counts": dict(task_counts),
        "source_counts": dict(source_counts),
        "exact_duplicate_groups": duplicate_groups,
        "patient_group_count": len({r["patient_group_id"] for r in records if r.get("patient_group_id")}),
        "errors": errors,
        "eligible": not errors,
    }
    if errors:
        raise PipelineError(json.dumps(result, indent=2, sort_keys=True))
    return result


def command_stage_azh(args: argparse.Namespace) -> None:
    output = Path(args.output).resolve()
    if output.exists() and any(output.iterdir()) and not args.force:
        raise PipelineError(f"staging directory is not empty: {output}; pass --force to replace it")
    if output.exists() and args.force:
        shutil.rmtree(output)
    safe_extract(Path(args.train_zip), output)
    safe_extract(Path(args.test_zip), output)
    print(json.dumps({"staged_root": str(output)}, indent=2))


def command_index(args: argparse.Namespace) -> None:
    root = Path(args.root).resolve()
    output = Path(args.output).resolve()
    if args.source == "AZH":
        count = index_azh(root, output, args.source_version)
    elif args.source == "DFUTissue":
        count = index_dfutissue(root, output, args.source_version)
    else:
        raise PipelineError("index currently supports AZH and DFUTissue; use canonical JSONL for owner archives")
    print(json.dumps({"source": args.source, "records": count, "manifest": str(output)}, indent=2))


def command_split(args: argparse.Namespace) -> None:
    manifest = Path(args.manifest).resolve()
    records = read_jsonl(manifest)
    summary = assign_group_splits(
        records,
        seed=args.seed,
        train_ratio=args.train_ratio,
        validation_ratio=args.validation_ratio,
        test_ratio=args.test_ratio,
        require_patient_groups=not args.audit_only,
    )
    output = Path(args.output).resolve()
    write_jsonl(output, records)
    summary["split_counts"] = dict(summary["split_counts"])
    summary["manifest"] = str(output)
    print(json.dumps(summary, indent=2, sort_keys=True))


def command_validate(args: argparse.Namespace) -> None:
    records = read_jsonl(Path(args.manifest).resolve())
    try:
        result = validate_records(records, Path(args.root).resolve(), require_patient_groups=not args.audit_only)
    except PipelineError as exc:
        print(str(exc), file=sys.stderr)
        raise
    print(json.dumps(result, indent=2, sort_keys=True))


def command_report(args: argparse.Namespace) -> None:
    records = read_jsonl(Path(args.manifest).resolve())
    mark_exact_duplicates(records)
    result = {
        "records": len(records),
        "sources": dict(Counter(record["source_dataset"] for record in records)),
        "tasks": dict(Counter(record["task"] for record in records)),
        "labels": dict(Counter(str(record.get("label")) for record in records)),
        "native_splits": dict(Counter(str(record.get("native_split")) for record in records)),
        "assigned_splits": dict(Counter(str(record.get("split")) for record in records)),
        "missing_patient_groups": sum(not record.get("patient_group_id") for record in records),
        "exact_duplicate_rows": sum(bool(record.get("is_exact_duplicate")) for record in records),
    }
    print(json.dumps(result, indent=2, sort_keys=True))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    stage = subparsers.add_parser("stage-azh", help="extract owner-approved AZH archives")
    stage.add_argument("--train-zip", required=True, type=Path)
    stage.add_argument("--test-zip", required=True, type=Path)
    stage.add_argument("--output", required=True, type=Path)
    stage.add_argument("--force", action="store_true")
    stage.set_defaults(func=command_stage_azh)

    index = subparsers.add_parser("index", help="create a source-native JSONL manifest")
    index.add_argument("--source", required=True, choices=["AZH", "DFUTissue"])
    index.add_argument("--root", required=True, type=Path)
    index.add_argument("--output", required=True, type=Path)
    index.add_argument("--source-version", required=True)
    index.set_defaults(func=command_index)

    split = subparsers.add_parser("split", help="assign deterministic patient-grouped splits")
    split.add_argument("--manifest", required=True, type=Path)
    split.add_argument("--output", required=True, type=Path)
    split.add_argument("--seed", type=int, default=42)
    split.add_argument("--train-ratio", type=float, default=0.70)
    split.add_argument("--validation-ratio", type=float, default=0.15)
    split.add_argument("--test-ratio", type=float, default=0.15)
    split.add_argument("--audit-only", action="store_true", help="audit records without creating a training-safe split")
    split.set_defaults(func=command_split)

    validate = subparsers.add_parser("validate", help="validate paths, annotations, groups, and split integrity")
    validate.add_argument("--manifest", required=True, type=Path)
    validate.add_argument("--root", required=True, type=Path)
    validate.add_argument("--audit-only", action="store_true")
    validate.set_defaults(func=command_validate)

    report = subparsers.add_parser("report", help="summarize a manifest")
    report.add_argument("--manifest", required=True, type=Path)
    report.set_defaults(func=command_report)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.func(args)
    except PipelineError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
