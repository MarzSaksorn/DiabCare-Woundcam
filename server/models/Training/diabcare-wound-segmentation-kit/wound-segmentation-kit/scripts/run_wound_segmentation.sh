#!/usr/bin/env bash
# Portable local runner for the binary wound-area segmentation prototype.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ROOT="$ROOT/data/wound-segmentation-patches"
OUTPUT_DIR="$ROOT/artifacts/wound-segmentation"
EPOCHS=10
BATCH_SIZE=8
IMAGE_SIZE=128
LEARNING_RATE="1e-3"
DEVICE="auto"
RESUME=""
FRESH=0
MAX_TRAIN=0

usage() {
  cat <<'EOF'
Usage:
  scripts/run_wound_segmentation.sh [options]

Options:
  --epochs N             Additional epochs, or total epochs for --fresh (default: 10)
  --batch-size N         Batch size (default: 8)
  --image-size N         Square training size (default: 128)
  --learning-rate RATE   Adam learning rate (default: 1e-3)
  --device NAME          auto, cpu, or cuda (default: auto)
  --source-root PATH     Override the image/mask dataset root
  --output-dir PATH      Override the checkpoint and metrics directory
  --resume PATH          Explicit best.pt or last.pt checkpoint
  --fresh                Start without resuming an existing checkpoint
  --max-train N          Limit training records for a smoke run
  -h, --help             Show this help

The default run resumes output-dir/last.pt when it exists, then output-dir/best.pt.
Use --fresh with a new --output-dir for a clean baseline.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --epochs) EPOCHS="${2:?missing value for --epochs}"; shift 2 ;;
    --batch-size) BATCH_SIZE="${2:?missing value for --batch-size}"; shift 2 ;;
    --image-size) IMAGE_SIZE="${2:?missing value for --image-size}"; shift 2 ;;
    --learning-rate) LEARNING_RATE="${2:?missing value for --learning-rate}"; shift 2 ;;
    --device) DEVICE="${2:?missing value for --device}"; shift 2 ;;
    --source-root) SOURCE_ROOT="${2:?missing value for --source-root}"; shift 2 ;;
    --output-dir) OUTPUT_DIR="${2:?missing value for --output-dir}"; shift 2 ;;
    --resume) RESUME="${2:?missing value for --resume}"; shift 2 ;;
    --max-train) MAX_TRAIN="${2:?missing value for --max-train}"; shift 2 ;;
    --fresh) FRESH=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ -d "$SOURCE_ROOT/train/images" ]] || { echo "error: missing $SOURCE_ROOT/train/images" >&2; exit 1; }
[[ -d "$SOURCE_ROOT/train/labels" ]] || { echo "error: missing $SOURCE_ROOT/train/labels" >&2; exit 1; }
[[ -d "$SOURCE_ROOT/test/images" ]] || { echo "error: missing $SOURCE_ROOT/test/images" >&2; exit 1; }
[[ -d "$SOURCE_ROOT/test/labels" ]] || { echo "error: missing $SOURCE_ROOT/test/labels" >&2; exit 1; }

if [[ "$FRESH" -eq 0 && -z "$RESUME" ]]; then
  if [[ -f "$OUTPUT_DIR/last.pt" ]]; then
    RESUME="$OUTPUT_DIR/last.pt"
  elif [[ -f "$OUTPUT_DIR/best.pt" ]]; then
    RESUME="$OUTPUT_DIR/best.pt"
  fi
fi

mkdir -p "$OUTPUT_DIR"
LOG_PATH="$OUTPUT_DIR/run-$(date -u +%Y%m%dT%H%M%SZ).log"
COMMAND=(
  python3 "$ROOT/scripts/train_prototype.py"
  wound-segmentation
  --source-root "$SOURCE_ROOT"
  --output-dir "$OUTPUT_DIR"
  --allow-source-split
  --image-size "$IMAGE_SIZE"
  --epochs "$EPOCHS"
  --batch-size "$BATCH_SIZE"
  --learning-rate "$LEARNING_RATE"
  --device "$DEVICE"
)
if [[ "$MAX_TRAIN" != "0" ]]; then COMMAND+=(--max-train "$MAX_TRAIN"); fi
if [[ -n "$RESUME" ]]; then COMMAND+=(--resume "$RESUME"); fi

printf 'Wound-area segmentation prototype\n'
printf '  source: %s\n  output: %s\n  resume: %s\n  epochs: %s\n  device: %s\n  log: %s\n' \
  "$SOURCE_ROOT" "$OUTPUT_DIR" "${RESUME:-none}" "$EPOCHS" "$DEVICE" "$LOG_PATH"
printf '%s\n' '  warning: source split is not patient-leakage-safe and output is not a diagnosis.'
printf '  command:'; printf ' %q' "${COMMAND[@]}"; printf '\n\n'

set -o pipefail
"${COMMAND[@]}" 2>&1 | tee "$LOG_PATH"
