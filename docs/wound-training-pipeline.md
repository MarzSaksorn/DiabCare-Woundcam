# Native multi-task wound training pipeline

This project has one existing ONNX detector, but the discovered sources do not share one label format. The pipeline therefore keeps three native tasks separate:

- **Detection:** DFUC2020 and Zivot bounding boxes.
- **Classification:** DFUC2021, AZH wound type, and the 146-image DFU severity set.
- **Segmentation:** DFUTissue pixel masks.

The pipeline must not turn classification labels into bounding boxes or turn body-map location metadata into masks.

## Data flow

```text
owner-approved archives or private object storage
        |
        v
source-specific staging and provenance capture
        |
        v
native JSONL manifests + SHA-256 hashes
        |
        v
exact duplicate audit + near-duplicate quarantine
        |
        v
patient/wound/visit/capture grouping
        |
        v
one deterministic group split shared by the relevant task
        |
        v
native task export
  detection / classification / segmentation
        |
        v
schema checks and class-balance report
        |
        v
training with logged config, seed, manifest hash, and source versions
```

## Current commands

The adapters currently cover the two public UWM/AZH releases available in the workspace. The other source adapters consume their owner-approved archives after they are staged.

```bash
python scripts/wound_pipeline.py stage-azh \
  --train-zip /path/to/dataset/Train.zip \
  --test-zip /path/to/dataset/Test.zip \
  --output /private-data/staging/AZH

python scripts/wound_pipeline.py index \
  --source AZH \
  --root /private-data/staging/AZH \
  --source-version 730-image-release \
  --output data/manifests/azh.classification.jsonl

python scripts/wound_pipeline.py index \
  --source DFUTissue \
  --root /private-data/staging/DFUTissueSegNet \
  --source-version UWM-AZH-original \
  --output data/manifests/dfutissue.segmentation.jsonl
```

Audit before splitting:

```bash
python scripts/wound_pipeline.py report \
  --manifest data/manifests/azh.classification.jsonl

python scripts/wound_pipeline.py validate \
  --manifest data/manifests/azh.classification.jsonl \
  --root /private-data/staging/AZH \
  --audit-only
```

The production split command intentionally fails when `patient_group_id` is missing:

```bash
python scripts/wound_pipeline.py split \
  --manifest data/manifests/azh.classification.jsonl \
  --output data/manifests/azh.classification.split.jsonl
```

That failure is expected for the public AZH release as currently published. The source describes repeated patients but does not provide a patient key. Do not fabricate one from an image filename or archive folder.

## Split rules

1. Hash every original file before any resize, crop, patch extraction, or augmentation.
2. Quarantine exact duplicates. Do not count an augmented or resized copy as a new clinical case.
3. Resolve owner-supplied patient, wound, visit, and capture IDs.
4. Assign each patient group to exactly one of train, validation, or test.
5. Split original cases before any augmentation or patch generation.
6. Fit normalization, class weights, and learned preprocessing on training records only.
7. Keep validation and test records untouched.
8. Keep all synchronized RGB, depth, and thermal views together.
9. Record the source-native split separately. It is not automatically leakage-safe.
10. Stop if a task has unresolved patient grouping or duplicate conflicts.

## What the current model can and cannot consume

The existing model metadata declares an Ultralytics detector with five classes:

```text
callus_corn
dfu_ulcer
infected_wound
necrotic_wound
normal_foot
```

Native classification and segmentation training cannot be silently appended to that detector. They require separate training artifacts and evaluation manifests. The final training implementation should produce one model and one evaluation report per task unless a deliberate multi-head architecture is introduced.

## Required inputs before execution

- Owner-approved archives or authorized object-storage URIs for DFUC2020, DFUC2021, Zivot, and the 146-image set.
- Patient or wound grouping keys from the source owner. A source-provided split without group IDs is not enough.
- Detection annotation format for DFUC2020 and Zivot.
- The documented training backend and command for each task.
- A private artifact location for raw data, derived files, logs, checkpoints, and experiment metadata.

No raw image or clinical archive belongs in GitHub. Commit manifests only after redacting private storage URLs and identifiers.
