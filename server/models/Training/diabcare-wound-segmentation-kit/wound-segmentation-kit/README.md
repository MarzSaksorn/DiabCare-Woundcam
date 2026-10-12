# DiabCare wound-segmentation local kit

This ZIP is a self-contained local research kit for the binary wound-area
segmentation prototype.

It includes:

- 1,109 training-ready image/mask pairs;
- the latest `best.pt` and `last.pt` research checkpoints;
- the PyTorch trainer;
- dataset validation;
- visual image/mask inspection;
- prediction overlays and mask-coverage JSON output;
- local dependency and provenance notes.

## Important warning

This dataset has no reliable patient or wound grouping IDs. Validation found
30 exact duplicate image groups in the packaged source split. The included
checkpoint and metrics are therefore **not patient-leakage-safe** and are not
clinical evidence.

This model is not a diagnosis, treatment recommendation, triage system, or
physical wound-area measurement tool.

## Quick start on Linux or macOS

```bash
cd wound-segmentation-kit
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install --index-url https://download.pytorch.org/whl/cpu torch
python -m pip install -r requirements-segmentation-local.txt
```

For NVIDIA GPU training, install a matching CUDA-enabled PyTorch build instead
of the CPU command. Do not mix CPU and CUDA PyTorch packages.

Check the included data:

```bash
python scripts/validate_wound_dataset.py \
  --root data/wound-segmentation-patches \
  --report artifacts/dataset-validation.json
```

Review image/mask alignment:

```bash
python scripts/inspect_wound_masks.py \
  --root data/wound-segmentation-patches \
  --output artifacts/mask-contact-sheet.png \
  --sample 12
```

Open `artifacts/mask-contact-sheet.png` before training.

## Continue the included checkpoint

The default command resumes `artifacts/wound-segmentation/last.pt`:

```bash
scripts/run_wound_segmentation.sh --epochs 5 --device cpu
```

Use the GPU when available:

```bash
scripts/run_wound_segmentation.sh --epochs 10 --device cuda
```

The command writes new checkpoints, metrics, and a timestamped log under
`artifacts/wound-segmentation/`.

## Train from scratch

Use a separate output directory so the included checkpoint stays available:

```bash
scripts/run_wound_segmentation.sh \
  --fresh \
  --output-dir artifacts/wound-segmentation-fresh \
  --epochs 10 \
  --device cpu
```

Smoke test only:

```bash
scripts/run_wound_segmentation.sh \
  --fresh \
  --output-dir artifacts/wound-segmentation-smoke \
  --epochs 1 \
  --max-train 32 \
  --device cpu
```

## Generate an overlay for one image

```bash
python scripts/predict_wound_segmentation.py \
  --checkpoint artifacts/wound-segmentation/best.pt \
  --image data/wound-segmentation-patches/test/images/b23232898bafcf304b2138af86be40b9_0.png \
  --output artifacts/prediction-overlay.png
```

This writes:

```text
artifacts/prediction-overlay.png
artifacts/prediction-overlay.mask.png
artifacts/prediction-overlay.json
```

The red overlay shows predicted wound pixels. The JSON reports pixel fraction,
not square centimetres. Physical area requires a calibrated camera or scale
reference.

## Continue a long run safely

```bash
tmux new -s wound-segmentation
scripts/run_wound_segmentation.sh --epochs 20 --device cuda
```

Detach with `Ctrl-b`, then `d`. Reconnect with:

```bash
tmux attach -t wound-segmentation
```

## Included result files

```text
artifacts/wound-segmentation/best.pt
artifacts/wound-segmentation/last.pt
artifacts/wound-segmentation/metrics.json
artifacts/dataset-validation.json
```

The bundled checkpoint previously reported a source-split test Dice of about
`0.7486`. Compare this against fresh runs, but don't treat it as a clinical
performance claim.

For full details, read `docs/wound-segmentation-local-kit.md`.
