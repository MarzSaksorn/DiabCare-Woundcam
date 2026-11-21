# Camera page Unslop review

**Status:** visual mockup for review only. No application UI has been migrated. The review branch is `feat/unslop-main-ui-2026-11-21`, based on `main` at `f348dbb`.

## Source audit

The audit reviewed the camera page and its styles on `main`, plus the camera redesign notes. It was source-only; the original app was not rendered in this pass.

- `client/src/styles/camera-redesign.css`: tracked uppercase labels and a Prompt/Sarabun font mismatch weaken the page's typographic consistency.
- Camera styles: a blue-token fork, pill-like control geometry, and a localized color wash in the viewfinder compete with the image as the main visual.
- Model-review affordance: the sparkle treatment and `AI LIVE ASSIST` wording imply continuous analysis, while inference starts after image capture and a manual review action.
- Patient-selection layout: the live markup's proportions differ from the documented 4:8 split. This mockup uses the documented compact-tools / patient-list arrangement.
- A second selection footer may depend on the shared shell. The source audit did not confirm it in a rendered page, so this brief does not call it a verified defect.

## Direction

- **Product:** DiabCare WoundCam helps clinicians capture wound images and review them before saving to a care record.
- **Character:** Calm, exact, clinically grounded.
- **World:** A clinical camera station: quiet record surfaces around a dark, instrument-like viewfinder.
- **Moments:** The framed wound-capture surface and a clear capture → review → save status rail.
- **Signature:** Source context stays explicit, so illustrative UI never reads as a patient or model result.

## Visual decisions

The mockup keeps the real DiabCare mark and the existing Prompt interface font, with JetBrains Mono reserved for compact metadata. Its neutral page canvas is `#f8fafc`, surfaces are white, primary text is `#0f172a`, secondary text is `#475569`, and hairlines use `#dbe2e9`. Clinical blue `#0369a1` marks the main action and selection; the camera surface uses deep navy `#0b1926`. Amber is reserved for an actual model-review state, not used decoratively. Controls use an 8px radius, cards 12px, and panels 16px, on a 4px spacing rhythm.

The layout keeps the existing dashboard shell, gives patient selection a compact case gate, and makes the active workflow a two-column capture-and-review console. On phones the console stacks, camera-workflow touch controls are at least 48px high, and patient details wrap instead of truncating.

## Safety and privacy copy retained verbatim

- Camera subtitle: “Create a clear, source-preserved image for the care team to review. No diagnosis is made from this screen.”
- Image handling: “Images stay in the local review workflow until a governed save action is introduced.”
- Clinical disclaimer: “Decision support only. This page does not diagnose infection, severity, or healing status.”
- Review boundary: “Model suggestions support a qualified clinician's review. They don't replace clinical judgment.”

These strings match the current English camera copy in `client/src/contexts/LanguageContext.tsx`. The mockup keeps the production bilingual implementation out of scope; it does not replace or migrate translations.

## Review-only boundary

The patient rows use explanatory placeholders, not names, identifiers, clinical records, or fabricated model output. The camera area is visibly disconnected. The page does not request camera permission, read the patient register, upload files, call inference, or save records. Its controls only switch between the two appearance states; camera, upload, review, and save actions are not connected.

The screenshots are renders of this standalone HTML file, not screenshots of the running application. Review the [patient-selection state](review/camera-selection-desktop.png), [capture/review state](review/camera-capture-desktop.png), [phone patient-selection state](review/camera-selection-mobile.png), and [phone capture/review state](review/camera-capture-mobile.png).

**Approval gate:** Please approve this visual direction or request changes. No application components or production styles will change until you explicitly approve migration.
