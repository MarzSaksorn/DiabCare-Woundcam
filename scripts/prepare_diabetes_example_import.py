#!/usr/bin/env python3
"""Validate and prepare bounded SQL requests for the diabetes example cohort."""
from __future__ import annotations

import csv
import hashlib
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

EXPECTED_HEADERS = [
    "year", "gender", "age", "location", "race:AfricanAmerican", "race:Asian",
    "race:Caucasian", "race:Hispanic", "race:Other", "hypertension",
    "heart_disease", "smoking_history", "bmi", "hbA1c_level",
    "blood_glucose_level", "diabetes", "clinical_notes",
]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/ubuntu/upload/diabetes_dataset_with_notes.csv")
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/home/ubuntu/diabetes-example-import")
BATCH_SIZE = 500
MAPPING_VERSION = "csv-v1"
FILE_HASH = hashlib.sha256(SOURCE.read_bytes()).hexdigest()


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def canonical_row(row: dict[str, str]) -> str:
    return "\x1f".join(row[h] for h in EXPECTED_HEADERS)


def finite_number(name: str, value: str, row_number: int) -> str:
    try:
        number = float(value)
    except ValueError as exc:
        raise ValueError(f"invalid numeric field {name} at source row {row_number}") from exc
    if not (number == number and abs(number) != float("inf")):
        raise ValueError(f"non-finite numeric field {name} at source row {row_number}")
    return value


def strict_binary(name: str, value: str, row_number: int) -> int:
    if value not in {"0", "1"}:
        raise ValueError(f"invalid binary field {name} at source row {row_number}")
    return int(value)


OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("*.json"):
    old.unlink()
for old in OUT.glob("*.sql"):
    old.unlink()

rows: list[dict[str, str]] = []
row_hashes: list[str] = []
with SOURCE.open(newline="", encoding="utf-8-sig") as handle:
    reader = csv.DictReader(handle)
    if reader.fieldnames != EXPECTED_HEADERS:
        raise SystemExit(f"header mismatch: expected {len(EXPECTED_HEADERS)} columns")
    for source_row_number, row in enumerate(reader, start=2):
        if any(value is None or value == "" for value in row.values()):
            raise SystemExit(f"blank source value at source row {source_row_number}")
        for field in ("year", "blood_glucose_level"):
            try:
                int(row[field])
            except ValueError as exc:
                raise SystemExit(f"invalid integer field {field} at source row {source_row_number}") from exc
        for field in ("age", "bmi", "hbA1c_level"):
            finite_number(field, row[field], source_row_number)
        for field in (
            "race:AfricanAmerican", "race:Asian", "race:Caucasian", "race:Hispanic",
            "race:Other", "hypertension", "heart_disease", "diabetes",
        ):
            strict_binary(field, row[field], source_row_number)
        race_sum = sum(int(row[field]) for field in (
            "race:AfricanAmerican", "race:Asian", "race:Caucasian", "race:Hispanic", "race:Other"
        ))
        if race_sum != 1:
            raise SystemExit(f"race indicators are not one-hot at source row {source_row_number}")
        rows.append(row)
        row_hashes.append(hashlib.sha256(canonical_row(row).encode("utf-8")).hexdigest())

counts = Counter(row_hashes)
duplicate_groups = {key for key, count in counts.items() if count > 1}
extra_rows = sum(count - 1 for count in counts.values() if count > 1)
duplicate_occurrences: dict[str, int] = defaultdict(int)

meta = {
    "source_filename": SOURCE.name,
    "file_sha256": FILE_HASH,
    "source_record_count": len(rows),
    "exact_duplicate_group_count": len(duplicate_groups),
    "exact_duplicate_extra_count": extra_rows,
    "mapping_version": MAPPING_VERSION,
    "batch_size": BATCH_SIZE,
}
(OUT / "metadata.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")

# The batch row is inserted first. Every chunk selects its batch id by exact file hash.
batch_query = (
    "insert into public.diabetes_example_import_batches "
    "(source_filename, file_sha256, source_record_count, exact_duplicate_group_count, "
    "exact_duplicate_extra_count, mapping_version, status) values ("
    f"{sql_quote(SOURCE.name)}, {sql_quote(FILE_HASH)}, {len(rows)}, {len(duplicate_groups)}, "
    f"{extra_rows}, {sql_quote(MAPPING_VERSION)}, 'validated') "
    "on conflict (file_sha256) do nothing returning id;"
)
(OUT / "00_batch.json").write_text(json.dumps({"project_id": "gpxgyvjoamwyrbswljyj", "query": batch_query}) + "\n", encoding="utf-8")

columns = [
    "import_batch_id", "source_row_number", "row_sha256", "exact_duplicate_group", "is_exact_duplicate",
    "year", "gender", "age", "location", "race_african_american", "race_asian", "race_caucasian",
    "race_hispanic", "race_other", "hypertension", "heart_disease", "smoking_history", "bmi",
    "hba1c_level", "blood_glucose_level", "diabetes_label", "clinical_notes",
]

for chunk_index, start in enumerate(range(0, len(rows), BATCH_SIZE), start=1):
    values = []
    for offset, row in enumerate(rows[start:start + BATCH_SIZE], start=start + 2):
        row_hash = row_hashes[offset - 2]
        duplicate_group = row_hash if row_hash in duplicate_groups else None
        is_duplicate_extra = duplicate_group is not None and duplicate_occurrences[row_hash] > 0
        duplicate_occurrences[row_hash] += 1
        values.append("(" + ", ".join([
            f"(select id from public.diabetes_example_import_batches where file_sha256 = {sql_quote(FILE_HASH)})",
            str(offset), sql_quote(row_hash), "null" if duplicate_group is None else sql_quote(duplicate_group),
            "true" if is_duplicate_extra else "false", str(int(row["year"])), sql_quote(row["gender"]),
            finite_number("age", row["age"], offset), sql_quote(row["location"]),
            str(int(row["race:AfricanAmerican"])), str(int(row["race:Asian"])), str(int(row["race:Caucasian"])),
            str(int(row["race:Hispanic"])), str(int(row["race:Other"])), str(int(row["hypertension"])),
            str(int(row["heart_disease"])), sql_quote(row["smoking_history"]), finite_number("bmi", row["bmi"], offset),
            finite_number("hbA1c_level", row["hbA1c_level"], offset), str(int(row["blood_glucose_level"])),
            str(int(row["diabetes"])), sql_quote(row["clinical_notes"]),
        ]) + ")")
    query = (
        "insert into public.diabetes_example_records (" + ", ".join(columns) + ") values\n" + ",\n".join(values) +
        " on conflict (import_batch_id, source_row_number) do nothing;"
    )
    payload = {"project_id": "gpxgyvjoamwyrbswljyj", "query": query}
    (OUT / f"{chunk_index:04d}_records.json").write_text(json.dumps(payload), encoding="utf-8")

print(json.dumps({**meta, "chunk_count": (len(rows) + BATCH_SIZE - 1) // BATCH_SIZE}))
