# Combined detector and AZH model results plan

**Branch:** `feat/combined-model-results`

**Base:** `training`

**Status:** Plan and hardening work. No deployment is included.

## 1. Goal

Display the existing wound detector result and the AZH classifier result
separately, but together, for every detected image region.

The user should be able to see:

1. what the detector found and where it found it;
2. what the AZH classifier predicts for that cropped region;
3. the confidence and full probability distribution for each model;
4. a clear review-required disclaimer.

The two taxonomies must remain separate. A detector label such as
`dfu_ulcer` must not be silently rewritten as AZH class `D`.

This is decision support for a research prototype, not a diagnosis.

## 2. Current baseline

The `training` branch already contains a first combined implementation:

- `server/models/diabetes-wound-detector.onnx`
- `server/models/azh-classifier.onnx`
- `server/woundInference.ts`
- `server/woundClassification.ts`
- protected `wound.infer` tRPC mutation
- `client/src/pages/DiagnosticCamera.tsx`
- visible per-region detector and AZH result cards
- AZH probability bars and readiness status

This branch should harden and verify that implementation. It should not create
a second competing inference path.

The new Roboflow detector candidate is separate from the current active detector
until the evaluation gate passes. Its ONNX export matches the current server
contract:

```text
input:  images [1, 3, 640, 640] float32
output: output0 [1, 300, 6] float32
```

The AZH classifier remains a separate model:

```text
input:  images [1, 3, 128, 128] float32
output: logits [1, 6] float32
```

## 3. Proposed user flow

```text
Select patient
  -> capture or upload RGB wound image
  -> run detector
  -> keep qualifying detector boxes
  -> crop each detector region
  -> run AZH classifier per crop
  -> show image overlay and per-region cards
  -> require human review before saving clinical interpretation
```

If the detector finds no qualifying region, the UI must show an inconclusive
state. It must not run the classifier on the full image as a hidden fallback.

## 4. Response contract

Keep existing response fields for compatibility. Add explicit pipeline metadata
only if it does not break existing consumers.

Recommended response shape:

```ts
type CombinedInferenceResult = {
  model: "diabetes-wound-detector";
  task: "detect";
  pipeline: "detector+azh-classifier";
  schemaVersion: 1;
  disclaimer: "Model suggestion only; clinician review required.";
  detector: {
    model: "diabetes-wound-detector";
    version: string;
    classes: string[];
    artifactSha256?: string;
  };
  classifier: {
    model: "azh-classifier";
    version: string;
    classes: ["BG", "D", "N", "P", "S", "V"];
    artifactSha256?: string;
  };
  detections: Detection[];
  topSuggestion: Detection | null;
  regions: RegionAnalysis[];
};

type RegionAnalysis = {
  detection: Detection;
  classification:
    | {
        status: "ok";
        model: "azh-classifier";
        code: "BG" | "D" | "N" | "P" | "S" | "V";
        name: string;
        confidence: number;
        probabilities: Record<string, number>;
      }
    | {
        status: "unavailable" | "error";
        model: "azh-classifier";
        reason: string;
      };
  reviewRequired: true;
};
```

The existing `task: "detect"` value stays unchanged for backward
compatibility. The new `pipeline` field identifies the combined behavior.

## 5. Implementation phases

### Phase 0: branch and provenance

- Keep all work on `feat/combined-model-results`.
- Record detector and classifier artifact SHA-256 values in metadata.
- Record model task, input size, class order, export version, and training run.
- Keep `.pt` checkpoints and raw datasets outside Git.
- Do not replace the active detector until Phase 5 passes.

### Phase 1: server inference hardening

Review and, where necessary, update:

- `server/woundInference.ts`
- `server/woundClassification.ts`
- `server/routers.ts`
- model metadata JSON files

Required behavior:

- preprocess detector input as RGB `[1,3,640,640]` with documented normalization;
- decode only the reviewed output shape `[1,300,6]` or preserve the existing
  tested fallback layouts;
- apply confidence filtering and class-aware suppression;
- clamp every box to the 640x640 image bounds;
- crop each kept detector region only after detection;
- preprocess classifier crops as RGB `128x128`, normalized by `pixel / 255`;
- return one classifier result per kept detector region;
- preserve a valid detector result if classifier inference fails;
- cap the number of regions processed per request;
- never write raw image data, patient identifiers, or clinical text to logs.

### Phase 2: frontend display

Update `client/src/pages/DiagnosticCamera.tsx` and related styles so the page
shows:

- detector boxes over the image;
- a detector label and confidence for each box;
- a separate AZH classifier label and confidence;
- all six AZH probabilities when classification succeeds;
- an explicit `Unavailable` or `Error` state when classification fails;
- a visible `Review required` state for every region;
- an explicit note that detector and AZH labels use different taxonomies;
- an inconclusive state when no detector region is found;
- bilingual English/Thai labels consistent with the existing language context.

Do not render combined claims such as `infected diabetic wound`. Keep the two
model outputs visually adjacent but semantically separate.

### Phase 3: accessibility and interaction

- Use real headings and landmarks for the analysis section.
- Give the image overlay an accessible description for each detection.
- Do not rely on color alone to distinguish model outputs.
- Expose probability bars with text values and accessible progress semantics.
- Announce analysis completion and errors through an appropriate live region.
- Keep result order stable when multiple regions are returned.
- Preserve visible keyboard focus and usable 200% zoom layout.
- Ensure the disclaimer appears near the result, not only in a tooltip.

### Phase 4: tests and local review

Server tests:

- detector-only response remains compatible;
- one detection produces one region analysis;
- multiple detections produce matching region counts;
- no detections produce an empty region list;
- classifier failure preserves detector output;
- probabilities sum to approximately `1`;
- class order matches metadata;
- crop coordinates remain within image bounds;
- low-confidence detections do not trigger classifier work;
- readiness reports detector and classifier independently;
- candidate detector ONNX loads with the same input/output contract.

Frontend tests:

- separate detector and classifier labels render;
- all six AZH probability names render;
- unavailable and error states render;
- no-detection state renders as inconclusive;
- multiple region cards render in stable order;
- review disclaimer is visible;
- accessible names exist for overlay and probability controls.

Required checks:

```bash
pnpm check
pnpm test
pnpm build
git diff --check
```

Then run the local preview and manually test:

- a normal-looking foot image;
- a single wound image;
- an image with multiple detected regions;
- a low-confidence image;
- an image that produces no detection;
- classifier-disabled and classifier-unavailable states.

### Phase 5: model evaluation gate

Before promoting the Roboflow fine-tuned detector:

1. evaluate the current detector and candidate on the same held-out test set;
2. report mAP50, mAP50-95, precision, recall, and per-class results;
3. inspect false positives and false negatives for every wound class;
4. verify no exact duplicates cross the split boundary;
5. document that patient/wound grouping is unavailable;
6. compare latency and memory use in the website inference path;
7. retain the current detector as the rollback artifact.

The current Roboflow candidate was stopped after five epochs. It must be
labelled as an incomplete research candidate until a local run completes and
produces the required evaluation report.

### Phase 6: review and promotion

- Keep the candidate detector disabled by default until review approves it.
- Promote the candidate only by replacing the versioned detector artifact and
  metadata together.
- Do not modify clinical assessment fields automatically.
- Do not present model output as a diagnosis or treatment recommendation.
- Obtain explicit confirmation before any production deployment.
- Record the promoted model hashes and rollback location.

## 6. Artifact and version layout

Recommended private training layout:

```text
models/
  diabcare/
    detector-candidates/
      woundcam-detector-finetune-01/
        best.pt
        last.pt
        best.onnx
        evaluation.json
        training-manifest.json
    backups/
      <timestamp>/
        diabetes-wound-detector.onnx
        diabetes-wound-detector.labels.json
```

Repository runtime layout:

```text
server/models/
  diabetes-wound-detector.onnx
  diabetes-wound-detector.labels.json
  azh-classifier.onnx
  azh-classifier.labels.json
```

The website must load ONNX artifacts only. Keep PyTorch checkpoints private.

## 7. Rollback plan

Rollback must require only one artifact restore and a server restart:

1. stop the server or deployment rollout;
2. restore the previous detector ONNX and metadata pair;
3. run `pnpm check`, `pnpm test`, and `pnpm build`;
4. restart the server;
5. verify detector-only and combined responses;
6. record the rollback reason and artifact hashes.

The AZH classifier must remain independently disableable. A classifier failure
must never remove or corrupt a valid detector response.

## 8. Acceptance criteria

The branch is ready for internal review when:

- detector and AZH classifier results appear together per detected region;
- labels remain in their original, separate taxonomies;
- every result shows confidence and review-required status;
- all six AZH probabilities are visible when available;
- no-detection and classifier-failure states are explicit;
- API and UI tests pass;
- `pnpm check`, `pnpm test`, and `pnpm build` pass;
- model hashes and provenance are recorded;
- no raw clinical data or patient identifiers enter Git or telemetry;
- the Roboflow candidate has a documented evaluation report;
- deployment remains a separate, explicitly approved step.

## 9. Proposed commit sequence

1. `docs: define combined detector and AZH result contract`
2. `feat: harden combined wound inference response`
3. `feat: display per-region detector and AZH results`
4. `test: cover combined model failure and accessibility states`
5. `docs: record candidate detector evaluation`
6. `chore: package reviewed detector artifact`

The first commit on this branch contains this plan only. Implementation and
model promotion should follow the phases above.
