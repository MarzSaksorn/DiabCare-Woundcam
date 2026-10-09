#!/usr/bin/env python3
"""Validate native manifests and run explicitly configured task trainers.

This entry point never guesses a framework or command. Configure one command
per native task only after the owner-approved data and group-safe manifests are
ready. Use --plan to inspect the exact commands before execution.
"""
from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wound_pipeline import PipelineError, read_jsonl, validate_records  # noqa: E402


TASKS = ("detection", "classification", "segmentation")


def load_config(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise PipelineError(f"invalid training config {path}: {exc}") from exc


def render_command(command: list[str], values: dict[str, str]) -> list[str]:
    return [part.format(**values) for part in command]


def validate_task_manifest(task: str, manifest_path: Path, root: Path) -> dict[str, Any]:
    records = read_jsonl(manifest_path)
    wrong_task = [record["record_id"] for record in records if record["task"] != task]
    if wrong_task:
        raise PipelineError(f"{manifest_path}: records do not all use task={task}: {wrong_task[:5]}")
    unsafe = [
        record["record_id"]
        for record in records
        if record.get("split_status") != "group_safe"
        or not record.get("split")
        or record.get("is_exact_duplicate")
    ]
    if unsafe:
        raise PipelineError(
            f"{manifest_path}: {len(unsafe)} records are not eligible for training; "
            f"examples: {unsafe[:5]}"
        )
    return validate_records(records, root, require_patient_groups=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--execute", action="store_true", help="run commands; default is plan-only")
    args = parser.parse_args()
    config = load_config(args.config.resolve())
    repo_root = Path(__file__).resolve().parents[1]
    data_root = Path(config["data_root"]).resolve()
    output_root = Path(config["output_root"]).resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    values = {
        "data_root": str(data_root),
        "output_root": str(output_root),
        "config": str(args.config.resolve()),
    }

    summaries: dict[str, Any] = {}
    commands: dict[str, list[str]] = {}
    for task in TASKS:
        task_config = config.get("tasks", {}).get(task, {})
        manifest = task_config.get("manifest")
        if not manifest:
            raise PipelineError(f"missing manifest for native task {task}")
        manifest_path = Path(manifest)
        if not manifest_path.is_absolute():
            manifest_path = repo_root / manifest_path
        manifest_path = manifest_path.resolve()
        if not manifest_path.exists():
            raise PipelineError(f"missing manifest for {task}: {manifest_path}")
        summaries[task] = validate_task_manifest(task, manifest_path, data_root)
        command = task_config.get("command") or []
        if not command:
            raise PipelineError(f"no explicit training command configured for {task}")
        commands[task] = render_command(command, {**values, "manifest": str(manifest_path), "task": task})

    plan = {"data_root": str(data_root), "output_root": str(output_root), "summaries": summaries, "commands": commands}
    print(json.dumps(plan, indent=2, sort_keys=True))
    if not args.execute:
        print("PLAN ONLY: pass --execute after reviewing the commands and manifests.")
        return 0

    for task in TASKS:
        command = commands[task]
        print(f"RUN {task}: {shlex.join(command)}", flush=True)
        env = os.environ.copy()
        env["DIABCARE_TASK"] = task
        subprocess.run(command, check=True, cwd=Path(__file__).resolve().parents[1], env=env)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
