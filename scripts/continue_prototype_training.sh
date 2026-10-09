#!/usr/bin/env bash
# Continue one research prototype from its latest checkpoint.
# This intentionally requires the source-split opt-in because public archives
# do not contain reliable patient or wound grouping keys.
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGING_ROOT="${DIABCARE_STAGING_ROOT:-/home/ubuntu/private-diabcare-staging}"
ARTIFACT_ROOT="${DIABCARE_ARTIFACT_ROOT:-/home/ubuntu/private-diabcare-artifacts}"
TASK="${1:-}"
shift || true

usage() {
  cat <<'EOF'
Usage:
  scripts/continue_prototype_training.sh <task> [options]

Tasks:
  classification
  wound-segmentation
  tissue-segmentation

Options:
  --epochs N             Additional epochs to run (default: 5)
  --source-root PATH     Override the task's default private dataset root
  --output-dir PATH      Override the task's default checkpoint directory
  --resume PATH          Override the checkpoint; default prefers output-dir/last.pt
  --device NAME          auto, cpu, or cuda (default: auto)
  --batch-size N         Override the trainer batch size
  --learning-rate RATE   Override the trainer learning rate
  --image-size N         Override the trainer image size
  --max-train N          Limit training records for a smoke run
  -h, --help             Show this help

Environment:
  DIABCARE_STAGING_ROOT  Private staging root
  DIABCARE_ARTIFACT_ROOT Private checkpoint/artifact root

Examples:
  scripts/continue_prototype_training.sh classification --epochs 5
  scripts/continue_prototype_training.sh tissue-segmentation --epochs 5
  scripts/continue_prototype_training.sh wound-segmentation --epochs 5
EOF
}

if [[ -z "$TASK" ]]; then
  usage
  exit 2
fi

if [[ "$TASK" == "-h" || "$TASK" == "--help" ]]; then
  usage
  exit 0
fi

case "$TASK" in
  classification)
    DEFAULT_SOURCE_ROOT="$STAGING_ROOT/fixed/azh-multimodal"
    DEFAULT_OUTPUT_DIR="$ARTIFACT_ROOT/prototype-20261009-classification-continued"
    TRAIN_COMMAND=(classification --image-size 128 --batch-size 32)
    ;;
  wound-segmentation)
    DEFAULT_SOURCE_ROOT="$STAGING_ROOT/extracted/nested/wound-segmentation/patches"
    DEFAULT_OUTPUT_DIR="$ARTIFACT_ROOT/prototype-20261009-continued/wound-segmentation"
    TRAIN_COMMAND=(wound-segmentation --image-size 128 --batch-size 8)
    ;;
  tissue-segmentation)
    DEFAULT_SOURCE_ROOT="$STAGING_ROOT/extracted/DFUTissueSegNet-main/DFUTissueSegNet-main"
    DEFAULT_OUTPUT_DIR="$ARTIFACT_ROOT/prototype-20261009-continued/tissue-segmentation"
    TRAIN_COMMAND=(tissue-segmentation --image-size 128 --batch-size 8)
    ;;
  *)
    echo "error: unsupported task: $TASK" >&2
    usage >&2
    exit 2
    ;;
esac

SOURCE_ROOT="$DEFAULT_SOURCE_ROOT"
OUTPUT_DIR="$DEFAULT_OUTPUT_DIR"
RESUME=""
EPOCHS=5
DEVICE="auto"
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --epochs)
      EPOCHS="${2:?missing value for --epochs}"
      shift 2
      ;;
    --source-root)
      SOURCE_ROOT="${2:?missing value for --source-root}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:?missing value for --output-dir}"
      shift 2
      ;;
    --resume)
      RESUME="${2:?missing value for --resume}"
      shift 2
      ;;
    --device)
      DEVICE="${2:?missing value for --device}"
      shift 2
      ;;
    --batch-size|--learning-rate|--image-size|--max-train)
      EXTRA_ARGS+=("$1" "${2:?missing value for $1}")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! [[ "$EPOCHS" =~ ^[1-9][0-9]*$ ]]; then
  echo "error: --epochs must be a positive integer" >&2
  exit 2
fi

if [[ -z "$RESUME" ]]; then
  if [[ -f "$OUTPUT_DIR/last.pt" ]]; then
    RESUME="$OUTPUT_DIR/last.pt"
  elif [[ -f "$OUTPUT_DIR/best.pt" ]]; then
    RESUME="$OUTPUT_DIR/best.pt"
  else
    echo "error: no checkpoint found in $OUTPUT_DIR" >&2
    echo "Train an initial prototype first, or pass --resume PATH." >&2
    exit 1
  fi
fi

[[ -d "$SOURCE_ROOT" ]] || { echo "error: source root does not exist: $SOURCE_ROOT" >&2; exit 1; }
[[ -f "$RESUME" ]] || { echo "error: resume checkpoint does not exist: $RESUME" >&2; exit 1; }
mkdir -p "$OUTPUT_DIR"

LOG_PATH="$OUTPUT_DIR/continue-$(date -u +%Y%m%dT%H%M%SZ).log"
COMMAND=(
  python3 "$REPO_ROOT/scripts/train_prototype.py"
  "${TRAIN_COMMAND[@]}"
  --source-root "$SOURCE_ROOT"
  --output-dir "$OUTPUT_DIR"
  --allow-source-split
  --epochs "$EPOCHS"
  --device "$DEVICE"
  --resume "$RESUME"
  "${EXTRA_ARGS[@]}"
)

printf 'Continuing research prototype\n'
printf '  task: %s\n  source: %s\n  output: %s\n  resume: %s\n  additional epochs: %s\n  log: %s\n' "$TASK" "$SOURCE_ROOT" "$OUTPUT_DIR" "$RESUME" "$EPOCHS" "$LOG_PATH"
printf '  warning: source split is not patient-leakage-safe; do not use for clinical decisions.\n'
printf '  command:'
printf ' %q' "${COMMAND[@]}"
printf '\n\n'

set -o pipefail
"${COMMAND[@]}" 2>&1 | tee "$LOG_PATH"
