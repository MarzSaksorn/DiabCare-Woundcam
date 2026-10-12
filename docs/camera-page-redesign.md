# Camera Page Redesign

**Mode:** Redesign · Overhaul
**Route:** `/camera` and `/assessments`
**Branch:** `feat/combined-model-results`
**Reference:** `docs/stitch-clinical-high-assurance-cockpit.md`

## Direction

The camera page follows the supplied **Clinical High-Assurance Cockpit** system. It uses a sterile slate canvas, crisp 1px borders, compact cards, dense queue rows, Prompt for UI copy, JetBrains Mono for identifiers and procedural labels, and a matte navy viewfinder for capture.

The case gate uses a 4/8 split: search and filters on the left, matching patient rows on the right. The active workflow uses a 7/5 split: camera evidence on the left, review and record linking on the right. The page keeps the existing DashboardLayout and the current real-data states.

## Tokens in use

The camera surface uses `#0B1926`. The page canvas uses `#F8FAFC`. Primary actions and focus states use `#0284C7`; active states use `#0369A1`; stable capture uses `#059669`; model review warnings use `#D97706`; errors use `#BA1A1A`. Structural borders use `#CBD5E1` and `#F1F5F9`.

Cards use 12px corners. Controls use 6px corners and a 40px base height. Elevation comes from borders and a restrained 1px shadow rather than floating blur. Capture guidance uses the viewfinder grid and cyan corner reticles from the reference.

## Copy rules

The page uses procedural copy. It tells the clinician what to select, capture, review, or save. It avoids marketing claims and does not describe model output as a diagnosis. New English copy follows the same rule: “Select the patient, take a clear wound image, and review the result before saving.”

## Protected behavior

The route paths, DashboardLayout, patient search and filtering, patient selection, camera permission flow, live video, frame capture, upload fallback, preview reset, inference payload, confidence threshold, detection and segmentation overlays, overlay toggles, wound-assessment selector, capture date/time, save mutation, toast feedback, diagnostic history, bilingual copy, focus states, live regions, help dialog, and clinical disclaimer remain unchanged.

HeroUI remains limited to the presentation layer. Its Card, Input, and Button primitives supply the camera page surfaces and controls. The inference component and the real capture-history queries keep their existing APIs and data flow.

## Reference constraints

The supplied Stitch HTML contains example patient IDs, station labels, and historical photos. Those examples are not copied into the product because this screen must render the connected patient and photo data. Empty, loading, and database-error states remain honest instead of showing fabricated records.
