# Portable wound-segmentation kit

This kit lets you train, continue, validate, inspect, and run the binary
wound-area segmentation prototype on a local machine.

It is a **research prototype**. The included source split has no reliable
patient or wound grouping IDs, so its metrics are not patient-leakage-safe and
must not be used as clinical validation.

## What is included in the ZIP

```text
wound-segmentation-kit/
├── README.md
├── requirements-segmentation-local.txt
├── scripts/
│   ├── train_prototype.py
│   ├── run_wound_segmentation.sh
│   ├── validate_wound_dataset.py
│   ├── inspect_wound_masks.py
│   ├── predict_wound_segmentation.py
│   └── predict_wound_segmentation_batch.py
├── data/wound-segmentation-patches/
│   ├── train/images/
│   ├── train/labels/
│   ├── test/images/
│   └── test/labels/
└── artifacts/wound-segmentation/
    ├── best.pt
    ├── last.pt
    └── metrics.json
```

The included dataset is already converted into paired PNG images and masks.
The original source archive is not required for this local run.

## Local setup

From the extracted kit directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

For CPU training, install PyTorch from the official CPU index:

```bash
python -m pip install --index-url https://download.pytorch.org/whl/cpu torch
python -m pip install -r requirements-segmentation-local.txt
```

For NVIDIA GPU training, install a matching PyTorch build from the official
PyTorch selector instead of the CPU command, then install the requirements file.
Do not mix CPU and CUDA PyTorch packages.

Verify the runtime:

```bash
python - <<'PY'
import torch
print("torch", torch.__version__)
print("cuda_available", torch.cuda.is_available())
PY
```

## 1. Validate the dataset

```bash
python scripts/validate_wound_dataset.py \
  --root data/wound-segmentation-patches \
  --report artifacts/dataset-validation.json
```

This checks:

- image and mask counts;
- missing masks;
- orphan masks;
- empty masks;
- mask values;
- exact duplicate image files across train and test.

Training should stop if the report says `valid_for_smoke_training: false`.

## 2. Inspect image-mask pairs visually

```bash
python scripts/inspect_wound_masks.py \
  --root data/wound-segmentation-patches \
  --output artifacts/mask-contact-sheet.png \
  --sample 12
```

Open `artifacts/mask-contact-sheet.png`. Each row contains:

1. source image;
2. ground-truth mask;
3. red overlay.

Check for shifted masks, empty masks, incorrect labels, and mismatched image and
mask pairs before training.

## 3. Continue the included checkpoint

The ZIP includes the latest research checkpoint. The default runner resumes
`artifacts/wound-segmentation/last.pt` automatically:

```bash
scripts/run_wound_segmentation.sh \
  --epochs 5 \
  --device cpu
```

Each `--epochs` value means additional epochs. The command writes:

```text
artifacts/wound-segmentation/best.pt
artifacts/wound-segmentation/last.pt
artifacts/wound-segmentation/metrics.json
artifacts/wound-segmentation/run-<timestamp>.log
```

For a GPU:

```bash
scripts/run_wound_segmentation.sh \
  --epochs 10 \
  --device cuda
```

For a long run, use `tmux`:

```bash
tmux new -s wound-segmentation
scripts/run_wound_segmentation.sh --epochs 20 --device cuda
```

Detach with `Ctrl-b`, then `d`. Reconnect with:

```bash
tmux attach -t wound-segmentation
```

## 4. Train a fresh model

Use a new output directory so the included checkpoint remains available for
comparison:

```bash
scripts/run_wound_segmentation.sh \
  --fresh \
  --output-dir artifacts/wound-segmentation-fresh \
  --epochs 10 \
  --device cpu
```

For a quick smoke run:

```bash
scripts/run_wound_segmentation.sh \
  --fresh \
  --output-dir artifacts/wound-segmentation-smoke \
  --epochs 1 \
  --max-train 32 \
  --device cpu
```

## 5. Generate a prediction overlay

Choose an input image and run:

```bash
python scripts/predict_wound_segmentation.py \
  --checkpoint artifacts/wound-segmentation/best.pt \
  --image data/wound-segmentation-patches/test/images/IMAGE.png \
  --output artifacts/prediction-overlay.png
```

This writes:

```text
artifacts/prediction-overlay.png
artifacts/prediction-overlay.mask.png
artifacts/prediction-overlay.json
```

The overlay marks predicted wound pixels in red. The JSON reports predicted
pixel fraction. That fraction is **not** square centimetres. Physical area
requires camera calibration or a known scale reference.

Adjust the segmentation threshold when reviewing predictions:

```bash
python scripts/predict_wound_segmentation.py \
  --checkpoint artifacts/wound-segmentation/best.pt \
  --image path/to/new-image.jpg \
  --output artifacts/new-overlay.png \
  --threshold 0.65
```

## 6. Generate overlays for a directory

Use the batch predictor instead of calling the single-image script in a shell
loop. It loads the checkpoint once and sends multiple images through the model
at a time:

```bash
python scripts/predict_wound_segmentation_batch.py \
  --checkpoint artifacts/wound-segmentation/best.pt \
  --input-dir data/wound-segmentation-patches/test/images \
  --output-dir artifacts/test-overlays \
  --device xpu \
  --batch-size 4
```

For CPU, use `--device cpu`. Start with `--batch-size 2` or `4` on an
integrated Intel Arc GPU, then increase it only if memory remains available.
The script creates `.overlay.png`, `.overlay.mask.png`, and `.overlay.json`
for every input image while keeping subdirectories intact.

The checkpoint is loaded once per command, not once per image.

## 7. Read the metrics

```bash
cat artifacts/wound-segmentation/metrics.json
```

The key metric is Dice overlap:

```text
Dice = overlap between predicted wound pixels and the reference mask
```

Also review the visual overlays. A single average Dice score can hide failures
on small wounds, dark images, shadows, dressings, or normal-foot images.

The packaged checkpoint previously reported a source-split test Dice of about
`0.7486`. Treat that as an engineering baseline only. It is not evidence of
patient-independent clinical performance.

## What this prototype does not do

- It does not diagnose a wound.
- It does not measure physical wound area.
- It does not classify wound type as diabetic, pressure, surgical, or venous.
- It does not guarantee patient-independent evaluation.
- It is not integrated into the website by this kit.

The website integration should happen only after visual review, patient-grouped
evaluation, ONNX export/parity testing, and explicit model promotion review.
