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

The classifier preserves the source-native folder labels `BG`, `D`, `N`, `P`, `S`, and `V`. Body-map metadata is not silently folded into the image-only baseline. A later multimodal model can consume it as a separate input after the metadata schema is finalized.

## Output contract

Each run writes:

- `best.pt`: PyTorch checkpoint
- `metrics.json`: config, source split counts, history, test metrics, and prototype warning

The output is for development and basic decision support only. It is not a diagnosis, treatment recommendation, triage decision, or substitute for a clinician. Do not use it for patient care until patient-grouped evaluation, external validation, calibration, bias analysis, and clinical review are complete.
