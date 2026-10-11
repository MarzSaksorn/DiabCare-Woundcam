# Kit provenance

- Task: binary wound-area segmentation.
- Source archive: user-supplied `wound-segmentation-master.zip`.
- Packaged derived data: source `patches` image/mask layout.
- Native source split: `train` and `test`; validation is created from 10% of source train records by the trainer.
- Patient group IDs: unavailable.
- Exact duplicate audit: 30 image duplicate groups were found in the packaged source split; see `artifacts/dataset-validation.json`.
- Checkpoint source: private research run `prototype-20261009-continued/wound-segmentation`.
- Prior source-split test Dice: approximately 0.7486.

This package is for local research and engineering work only. It must not be
used to make clinical decisions or represented as patient-independent evidence.
