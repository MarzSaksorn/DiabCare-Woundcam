# Research prototype training

The uploaded archives support separate native prototypes:

- wound-area segmentation from `wound-segmentation-master.zip`
- tissue segmentation from `DFUTissueSegNet-main.zip`
- source-native wound classification from the AZH image/location release

These prototypes use the datasets' published source splits. The archives do not include patient or wound grouping keys, so the metrics are **not patient-leakage-safe** and must not be presented as clinical evidence.

The explicit `--allow-source-split` flag is required. It prevents accidental use of this mode from being confused with the production-safe pipeline.

## Wound-area segmentation

```bash
python scripts/train_prototype.py wound-segmentation \
  --source-root /private-data/diabcare-staging/wound-segmentation-patches \
  --output-dir /private-data/diabcare-artifacts/wound-segmentation-prototype \
  --allow-source-split \
  --image-size 128 \
  --epochs 3 \
  --batch-size 8
```

This trains a small binary U-Net prototype. It uses 90% of the source `train/images` pairs for optimization, 10% for validation, and the source `test/images` pairs for the reported test metric. Masks remain binary wound-area masks.

## Tissue segmentation

```bash
python scripts/train_prototype.py tissue-segmentation \
  --source-root /private-data/diabcare-staging/DFUTissueSegNet \
  --output-dir /private-data/diabcare-artifacts/dfutissue-prototype \
  --allow-source-split \
  --image-size 128 \
  --epochs 3 \
  --batch-size 8
```

This trains a small four-channel-output U-Net prototype over the source palette labels. The source's 78/16/16 split is retained for audit, but it does not establish patient-disjoint evaluation.

## AZH classification

```bash
python scripts/train_prototype.py classification \
  --source-root /private-data/diabcare-staging/azh-multimodal \
  --output-dir /private-data/diabcare-artifacts/azh-classification-prototype \
  --allow-source-split \
  --image-size 128 \
  --epochs 3 \
  --batch-size 32
```

The classifier preserves the source-native folder labels `BG`, `D`, `N`, `P`, `S`, and `V`, and stores this display mapping in `metrics.json` and the checkpoint:

```text
BG = Background
N  = Normal skin
D  = Diabetic wound
P  = Pressure wound
S  = Surgical wound
V  = Venous wound
```

Body-map metadata is not silently folded into the image-only baseline. A later multimodal model can consume it as a separate input after the metadata schema is finalized.

## Roboflow detector fine-tuning

The Roboflow upload is a valid Ultralytics detector checkpoint with the same
five class order used by the website:

```text
0 callus_corn
1 dfu_ulcer
2 infected_wound
3 necrotic_wound
4 normal_foot
```

The uploaded file is a `best.pt` checkpoint. It contains model weights but no
optimizer state, so it can be fine-tuned from those weights. It is **not** a
full epoch-and-optimizer resume checkpoint. Use a later Ultralytics `last.pt`
with `--resume` only when that file contains the original training state.

The Roboflow export must also include a private YOLO dataset with `data.yaml`
and matching `images/` and `labels/` directories. The command validates class
order, image/label pairs, class IDs, and normalized bounding boxes before it
starts training.

Validate the dataset without training first:

```bash
python scripts/train_detector.py \
  --weights /private-data/roboflow-detector-source/best.pt \
  --data /private-data/roboflow-wound-dataset/data.yaml \
  --output /private-data/roboflow-detector-artifacts \
  --allow-source-split \
  --dry-run
```

After the dry run passes, fine-tune the checkpoint:

```bash
python scripts/train_detector.py \
  --weights /private-data/roboflow-detector-source/best.pt \
  --data /private-data/roboflow-wound-dataset/data.yaml \
  --output /private-data/roboflow-detector-artifacts \
  --name woundcam-detector-finetune-01 \
  --allow-source-split \
  --epochs 20 \
  --imgsz 640 \
  --batch 8 \
  --device cpu
```

The command writes the Ultralytics run directory and a `training-manifest.json`
containing checkpoint and dataset hashes, split counts, class order, and the
research-only warning. Do not copy the resulting checkpoint into
`server/models` until it has independent evaluation and explicit integration
review.

## Output contract

Each run writes:

- `best.pt`: PyTorch checkpoint
- `metrics.json`: config, source split counts, history, test metrics, and prototype warning

## Continuing training

The repository includes a convenience wrapper that selects the current private
dataset root, prefers `last.pt`, restores the optimizer and history, and writes a
timestamped continuation log. Run it from the repository root:

```bash
scripts/continue_prototype_training.sh classification --epochs 5
scripts/continue_prototype_training.sh tissue-segmentation --epochs 5
scripts/continue_prototype_training.sh wound-segmentation --epochs 5
```

Each `--epochs` value means **additional epochs**, not a final total. The
wrapper defaults to the private staging and artifact paths used in this
workspace. On another machine, set `DIABCARE_STAGING_ROOT` and
`DIABCARE_ARTIFACT_ROOT`, or override the paths directly:

```bash
DIABCARE_STAGING_ROOT=/private-data/diabcare-staging \
DIABCARE_ARTIFACT_ROOT=/private-data/diabcare-artifacts \
scripts/continue_prototype_training.sh classification --epochs 10
```

Useful overrides include:

```bash
scripts/continue_prototype_training.sh classification \
  --epochs 5 \
  --device cpu \
  --output-dir /private-data/diabcare-artifacts/azh-classification-prototype \
  --resume /private-data/diabcare-artifacts/azh-classification-prototype/last.pt
```

The wrapper requires an existing `last.pt` or `best.pt`. It fails closed when
the dataset or checkpoint path is missing. It always passes
`--allow-source-split` because these uploaded archives do not contain reliable
patient or wound grouping IDs.

The equivalent direct command is:

```bash
python scripts/train_prototype.py classification \
  --source-root /private-data/diabcare-staging/azh-multimodal \
  --output-dir /private-data/diabcare-artifacts/azh-classification-prototype \
  --allow-source-split \
  --epochs 5 \
  --resume /private-data/diabcare-artifacts/azh-classification-prototype/last.pt
```

The trainer restores the model, optimizer, best validation loss, and history.
Older model-only checkpoints are also accepted; those resume with a fresh
optimizer. Each run updates `last.pt`, updates `best.pt` only when validation
loss improves, rewrites `metrics.json`, and stores the console output in a
timestamped `.log` file when launched through the wrapper.

The output is for development and basic decision support only. It is not a diagnosis, treatment recommendation, triage decision, or substitute for a clinician. Do not use it for patient care until patient-grouped evaluation, external validation, calibration, bias analysis, and clinical review are complete.
