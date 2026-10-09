# DiabCare wound-model data layout

Raw clinical images and annotations stay outside Git. The repository stores only schemas, manifests, configs, and code.

```text
data/
  raw/                         # ignored; source-owned archives or extracted files
    DFUC2020/
    DFUC2021/
    Zivot/
    DFUTissue/
    AZH/
    DFU-fewshot-146/
  manifests/                  # committed JSONL manifests; no clinical pixels
    detection.jsonl
    classification.jsonl
    segmentation.jsonl
    group_splits.json
  artifacts/                   # ignored; derived caches, exported datasets, logs
```

## Required provenance fields

Every manifest row must retain:

- `record_id`: stable source-native record identifier.
- `source_dataset` and `source_version`: never merge sources without these fields.
- `task`: one of `detection`, `classification`, or `segmentation`.
- `image_uri`: path relative to the configured raw-data root or an approved object-storage URI.
- `annotation_uri`: native box, label, or mask path when available.
- `label`: source-native class or severity label. Do not silently translate it.
- `patient_group_id`: required for leakage-safe training. Never derive it from a filename unless the owner documents that convention.
- `wound_group_id`, `visit_group_id`, and `capture_group_id`: preserve finer grouping when available.
- `sha256`, `width`, and `height`: integrity and duplicate-audit fields.
- `native_split`: the source-provided split, retained for comparison only.
- `split`: the split assigned by our group-aware splitter.

A missing `patient_group_id` is an explicit blocker. The pipeline may index and audit such rows, but it must not mark them eligible for training.

## Source-native task mapping

| Source | Native task | Use in this project |
| --- | --- | --- |
| DFUC2020 | Detection | Ulcer bounding-box detection |
| DFUC2021 | Classification | Control/infection/ischaemia classification |
| Zivot DFU | Detection and multimodal metadata | RGB box detection; depth/thermal kept by capture group |
| DFUTissue | Segmentation | Tissue-mask segmentation |
| AZH | Classification plus location metadata | Wound-type classification; keep body-map labels as metadata |
| DFU few-shot 146 | Classification | Three-class severity classification |

Do not turn image-level labels into boxes, masks, or diagnoses. Do not turn body-map location metadata into a segmentation mask.

## Storage rules

Do not commit clinical images, archives, credentials, patient identifiers, or presigned URLs. Use an approved private object store or a local encrypted staging volume and commit only manifests with redacted, reproducible URIs.
