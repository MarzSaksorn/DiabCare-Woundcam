# Three-model website integration plan

**Branch:** `feat/combined-model-results`

**Base:** latest remote `feat/combined-model-results`

**Status:** Implemented in the working tree. The feature remains disabled by default; this document does not deploy or promote a model.

## 1. Goal

Put the three research models into one website analysis flow while keeping their
outputs separate and understandable:

1. **Wound detector** finds candidate regions and draws bounding boxes.
2. **AZH classifier** classifies each detected crop into the six AZH classes.
3. **Wound-area segmentation** predicts the wound pixels inside each detected
   region and displays a mask overlay.

The website must never collapse these outputs into a single diagnosis. For
example, `necrotic_wound`, `D · Diabetic wound`, and a predicted wound mask are
three different model outputs.

All output remains decision support only and requires clinician review.

## 2. Current state

The current website runtime already packages:

```text
server/models/diabetes-wound-detector.onnx
server/models/diabetes-wound-detector.labels.json
server/models/azh-classifier.onnx
server/models/azh-classifier.labels.json
```

The existing server pipeline is:

```text
image -> detector -> detected regions -> AZH classifier per region
```

The wound-area model exists as PyTorch checkpoints in the training artifacts and
as a parity-validated ONNX runtime artifact:

```text
server/models/Training/diabcare-wound-segmentation-kit/
  wound-segmentation-kit/artifacts/wound-segmentation-xpu/best.pt
  wound-segmentation-kit/artifacts/wound-segmentation-xpu/last.pt
server/models/wound-segmentation.onnx
server/models/wound-segmentation.labels.json
```

The `.pt` files remain training artifacts, not the website runtime format. The
website uses Node ONNX Runtime; `best.pt` was exported and parity-tested as ONNX
before the runtime artifact was added.

Use `best.pt` for inference. Keep `last.pt` for resuming training only.

## 3. Target data flow

```text
capture or upload RGB image
        |
        v
wound detector ONNX
        |
        v
bounded detector regions
        |
        +--------------------------+
        |                          |
        v                          v
AZH classifier ONNX       wound segmentation ONNX
on each crop              on each crop
        |                          |
        +-------------+------------+
                      v
            per-region combined result
                      |
        boxes + AZH probabilities + mask overlay
                      |
             clinician review required
```

Segmentation must run on the detector crop, not on an arbitrary full-image
fallback. If there are no qualifying detector regions, the page shows an
**inconclusive** state and does not run the classifier or segmentation model on
the full image.

## 4. Model packaging and export

### 4.1 Export the segmentation checkpoint

Add a deterministic exporter, for example:

```text
scripts/export_wound_segmentation.py
```

The exporter should:

- load `best.pt` and its `SmallUNet(classes=1)` architecture;
- export an ONNX model with opset 17;
- use input `images` with shape `[batch, 3, 128, 128]`;
- use output `mask_logits` with shape `[batch, 1, 128, 128]`;
- preserve FP32 behavior first;
- write a metadata JSON next to the ONNX artifact;
- record source checkpoint hash and exported ONNX hash.

The model input contract is:

```text
RGB
resize: 128 x 128
normalization: pixel / 255
```

The output must be interpreted as logits:

```text
probability = sigmoid(mask_logits)
mask = probability >= threshold
```

Keep the threshold configurable. Start with `0.50`; choose a production
candidate threshold only after validation on held-out data.

### 4.2 Runtime artifact layout

Add these files only after export and parity checks pass:

```text
server/models/wound-segmentation.onnx
server/models/wound-segmentation.labels.json
```

Suggested metadata:

```json
{
  "model": "wound-segmentation",
  "version": "wound-segmentation-xpu-best",
  "task": "binary_segmentation",
  "format": "onnx",
  "input": {
    "name": "images",
    "shape": ["batch", 3, 128, 128],
    "color_order": "RGB",
    "normalization": "pixel / 255"
  },
  "output": {
    "name": "mask_logits",
    "shape": ["batch", 1, 128, 128]
  },
  "classes": ["background", "wound"],
  "threshold": 0.5,
  "clinical_use": false
}
```

Do not make the website load `best.pt` directly. Do not put `last.pt` in the
runtime model directory.

## 5. Server implementation

### 5.1 Add a segmentation inference module

Create:

```text
server/woundSegmentation.ts
server/woundSegmentation.test.ts
```

The module should provide:

```ts
getWoundSegmentationReadiness()
getWoundSegmentationContract()
segmentWoundCrop(crop, width, height)
```

Required behavior:

- cache one ONNX Runtime session per process;
- validate metadata before loading the session;
- verify the artifact hash when metadata includes one;
- resize the crop to `128 x 128` with the documented preprocessing;
- return a bounded binary mask or encoded mask payload;
- return mask width and height explicitly;
- return probability threshold and wound-pixel coverage;
- return an explicit `unavailable` or `error` state;
- never log image bytes, patient identifiers, or clinical notes;
- fail closed when the output tensor name or shape is wrong.

### 5.2 Extend the orchestrator

Update:

```text
server/woundInference.ts
server/_core/systemRouter.ts
server/routers.ts, only if the route contract needs a schema version update
```

For each kept detector region:

1. crop the decoded RGB image using the bounded detector box;
2. send the crop to AZH classification and wound segmentation;
3. keep both model outputs associated with the same region index;
4. preserve detector output if either downstream model fails;
5. cap processing at the existing maximum region count;
6. avoid unbounded concurrent memory use;
7. keep result order stable.

For correctness, run AZH and segmentation in parallel per region only after
both modules have independent tests. If latency or memory is high, process
regions in a small bounded queue or batch crops by model.

### 5.3 Readiness and feature flag

Extend combined readiness with segmentation:

```ts
{
  detector: { available: boolean, ... },
  classifier: { available: boolean, ... },
  segmentation: { available: boolean, ... }
}
```

Add a server-side feature flag:

```text
WOUND_SEGMENTATION_ENABLED=false
```

The default must remain disabled until export, parity, visual review, and
latency checks pass. A disabled segmentation model must not break detector or
AZH results.

## 6. API response contract

Keep existing detector and AZH fields. Add a versioned pipeline identifier and
segmentation data to each region:

```ts
type ThreeModelInferenceResult = {
  model: "diabetes-wound-detector";
  task: "detect";
  pipeline: "detector+azh-classifier+wound-segmentation";
  schemaVersion: 2;
  disclaimer: "Model suggestion only; clinician review required.";
  detector: DetectorContract;
  classifier: AzhClassifierContract;
  segmentation: SegmentationContract;
  detections: Detection[];
  topSuggestion: Detection | null;
  regions: ThreeModelRegion[];
};

type ThreeModelRegion = {
  detection: Detection;
  classification: AzhClassification | ClassificationFailure;
  segmentation:
    | {
        status: "ok";
        model: "wound-segmentation";
        threshold: number;
        mask: {
          width: 128;
          height: 128;
          encoding: "png-base64";
          data: string;
        };
        woundPixelFraction: number;
      }
    | {
        status: "unavailable" | "error";
        model: "wound-segmentation";
        reason: string;
      };
  reviewRequired: true;
};
```

### Mask transport decision

Use a bounded binary PNG encoded in base64 for the first implementation. The
mask is only `128 x 128`, so it is simple to render and easy to test. Enforce a
response size limit and keep the maximum region count bounded.

Do not return full-resolution mask images unless a measured performance test
shows that the low-resolution mask is inadequate. If response size becomes a
problem, replace the transport with row-wise run-length encoding without
changing the semantic response fields.

Do not persist the mask into clinical assessment fields automatically. If model
results are later saved, store model version, artifact hashes, threshold, and
review status as separate research metadata.

## 7. Frontend display

Update:

```text
client/src/pages/DiagnosticCamera.tsx
client/src/index.css
```

### 7.1 Image overlay

Keep detector boxes and add segmentation masks inside their matching boxes.
The rendering order should be:

```text
image
  -> semi-transparent wound masks
  -> detector boxes and labels
```

Add accessible controls:

- `Show detector boxes`;
- `Show wound-area masks`;
- optional mask opacity control;
- legend identifying detector boxes, AZH result cards, and segmentation masks.

The default should show masks only when segmentation status is `ok`.

The overlay must map the 128x128 crop mask back into its detector box using
nearest-neighbor scaling. It must not stretch a crop mask over the entire image.

### 7.2 Per-region result card

Extend each region card to show three separate sections:

```text
Detector
  necrotic_wound · 82%

AZH classifier
  D · Diabetic wound · 61%
  BG 2% | D 61% | N 4% | P 18% | S 9% | V 6%

Wound-area segmentation
  mask available · threshold 50%
  predicted mask coverage: 18.4% of this detector crop
```

Use wording such as **predicted mask coverage**, not wound size. It is a pixel
fraction and not square centimetres.

Show explicit states:

- `Segmentation unavailable`;
- `Segmentation error`;
- `No wound pixels above threshold`;
- `Review required`.

Do not display a combined phrase such as `necrotic diabetic wound`. Preserve
the original detector and AZH taxonomies.

### 7.3 No-detection and partial-failure states

- No detector regions: show inconclusive, no downstream model results.
- Detector available, AZH unavailable: show detector plus AZH unavailable.
- Detector and AZH available, segmentation unavailable: show both existing
  results and segmentation unavailable.
- Segmentation returns an empty mask: show that explicitly; do not hide it.
- Any server error: keep the image and show a clear retry/review message.

## 8. Accessibility requirements

- Use a named analysis landmark and stable heading hierarchy.
- Give the overlay a text alternative describing count and region labels.
- Do not use red mask color as the only signal; show text and a legend.
- Make mask and box toggles keyboard accessible with visible focus.
- Expose mask coverage as text, not only a visual fill.
- Announce analysis completion and failures through an appropriate live region.
- Keep the disclaimer adjacent to all three model results.
- Verify the layout at 200% zoom and on narrow screens.
- Preserve logical tab order and minimum touch target sizes.

## 9. Validation gates before enabling the feature

### 9.1 Export parity

Create deterministic parity tests that run the same fixtures through PyTorch and
ONNX and compare:

- logits within a declared tolerance;
- sigmoid probabilities;
- thresholded masks;
- wound-pixel fraction.

Use at least 12 fixtures covering empty, small, and large masks. Record:

- checkpoint SHA-256;
- ONNX SHA-256;
- exporter version;
- opset;
- maximum absolute difference;
- tolerance;
- fixture count.

### 9.2 Server tests

Add tests for:

- segmentation readiness when artifact and metadata are present;
- metadata hash mismatch failure;
- input crop preprocessing;
- output tensor name and shape validation;
- mask values and dimensions;
- threshold behavior;
- coverage range `[0, 1]`;
- invalid or zero-area crops;
- segmentation failure preserving detector and AZH output;
- no detection producing no downstream calls;
- stable region ordering;
- response size and region-count limits.

### 9.3 UI tests

Add tests for:

- mask overlay mapped to the detector box;
- detector, AZH, and segmentation sections rendering separately;
- mask toggle and opacity controls;
- all six AZH probabilities remaining visible;
- empty-mask state;
- unavailable/error states;
- no-detection state;
- accessible labels and live-region updates;
- bilingual English/Thai display.

### 9.4 Manual and performance checks

Run:

```bash
pnpm check
pnpm test
pnpm build
git diff --check
```

Manual review should include:

- no wound or normal-foot image;
- single wound region;
- multiple detector regions;
- small wound;
- large wound;
- low-light image;
- shadow or dressing;
- malformed image;
- classifier disabled;
- segmentation disabled;
- segmentation empty mask.

Measure:

- detector-only latency;
- detector + AZH latency;
- detector + AZH + segmentation latency;
- memory use with 1, 5, and 20 regions;
- response payload size.

The three-model path must not block the existing detector and AZH path when the
feature flag is disabled or the segmentation artifact is unavailable.

## 10. Dataset and model risk gate

The wound segmentation model was trained on source-split patch data. The source
archive has no reliable patient or wound grouping IDs, and the audit found exact
duplicate image groups. The current Dice result is an engineering baseline, not
patient-independent clinical evidence.

Before any clinical-facing promotion:

1. obtain patient/wound/session grouping keys;
2. quarantine exact and likely near-duplicates;
3. split original cases before patching or augmentation;
4. evaluate on group-disjoint validation and test sets;
5. test on new camera images from the target workflow;
6. assess empty-mask and small-wound behavior;
7. calibrate the threshold for the intended operating point;
8. document bias, failure modes, and reviewer workflow.

Until those gates pass, keep the feature visibly labelled as a research
prototype and do not use its mask coverage as a treatment or triage input.

## 11. Rollout and rollback

### Rollout

1. Add the ONNX artifact and metadata together.
2. Keep `WOUND_SEGMENTATION_ENABLED=false` by default.
3. Enable it in local preview only.
4. Run export parity and website tests.
5. Review visual overlays on representative images.
6. Enable for a private internal preview.
7. Record model hashes, threshold, and latency.
8. Obtain explicit approval before production deployment.

### Rollback

Rollback must be one feature flag and, if needed, one artifact removal:

```text
WOUND_SEGMENTATION_ENABLED=false
```

The detector and AZH outputs must continue working after segmentation is
turned off. If the ONNX artifact is removed, readiness should report
`unavailable` rather than crash the inference route.

Do not replace the active detector as part of this segmentation integration.
That is a separate candidate-evaluation decision.

## 12. Proposed commit sequence

1. `docs: plan three-model website integration`
2. `feat: export and validate wound segmentation ONNX`
3. `feat: add server wound segmentation inference`
4. `feat: extend combined model response with masks`
5. `feat: display segmentation overlays and coverage`
6. `test: cover three-model inference and UI states`
7. `docs: record three-model validation and rollout decision`

## 13. Acceptance criteria

The branch is ready for internal preview when:

- detector boxes, AZH results, and segmentation masks appear for the same
  region;
- each model keeps its own label and confidence semantics;
- the mask is positioned inside the matching detector box;
- all partial-failure states are explicit;
- `best.pt` has been exported to ONNX and parity-tested;
- model metadata and hashes are recorded;
- server and UI tests pass;
- payload size and latency remain acceptable;
- no raw patient identifiers enter logs or metadata;
- the feature is disabled safely with one flag;
- rollback leaves detector and AZH behavior intact;
- no deployment occurs without explicit approval.
