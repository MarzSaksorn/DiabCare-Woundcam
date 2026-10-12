# Camera Page Redesign

**Mode:** Redesign · Overhaul
**Route:** `/camera` and `/assessments`
**Branch:** `feat/combined-model-results`

## Design read

This is a tablet-first clinical wound-image capture console for doctors, nurses, and care-team members working under time pressure. The new visual language treats the camera surface as the main instrument, not another dashboard card. HeroUI v3 provides the accessible Card, Input, and Button primitives; scoped clinical CSS supplies the DiabCare identity, camera canvas, model review states, and responsive composition.

The visual-variance dial is 6/10 because the page moves from a dashboard form into a capture console. Motion remains 2/10 because clinical evidence work benefits from stable feedback. Information density stays at 8/10. Asset dependence remains 4/10 because the existing logo is retained and clinical images remain real user evidence. Brand fidelity is 8/10 through the existing logo, Atkinson Hyperlegible, clinical blue tokens, and established DashboardLayout.

## Positioning questions

The narrative starts with a **case gate**, moves into **evidence capture**, then ends with **clinician review and record link**. The page is designed for a 60–90 cm tablet viewing distance, with 17–20px body text and 48px-plus primary controls. The page canvas stays calm and off-white. The camera becomes deep navy and instrument-like. Amber marks review-required states. Red appears only for camera or data errors.

The capacity check is deliberate. Before a patient is selected, the screen gives the search and result state enough room without pretending there is camera content. After selection, the main grid gives the evidence surface the larger column and keeps review, model output, and record assignment in a right rail. On mobile, the evidence surface appears first and the review rail follows.

## Before-and-after plan

### Preserve

The route paths, DashboardLayout, patient search and filtering, patient selection, browser camera permission flow, live video, frame capture, upload fallback, preview reset, object URL cleanup, inference payload, confidence threshold, detection and segmentation overlays, overlay toggles, wound-assessment selector, capture date/time, save mutation, toast feedback, diagnostic history, bilingual copy, focus states, live regions, keyboard help dialog, and clinical disclaimer all remain intact.

### Improve

The former multi-card dashboard framing becomes a compact clinical header followed by a case gate. The selected patient becomes a persistent active-case banner. The active workflow uses a two-column console: a dark navy camera evidence surface on the left and a review/record rail on the right. HeroUI `Card`, `Input`, and `Button` components provide the new accessible control foundation. The page keeps tablet-sized controls and stacks cleanly on mobile.

### Remove

The redesign removes the old full-width stepper, repeated dashboard chrome, large empty selector framing, generic soft-shadow treatment, and green/blue visual mismatch. It does not remove any workflow or data state.

## Protected contracts

No backend, database schema, API, route, form field, mutation payload, local state key, inference model contract, or clinical disclaimer changed. The redesign changes presentation, composition, and component primitives only.

## Highest-risk change

The highest-risk area is the camera and model-result composition because `WoundInferenceResults` owns shared behavior. The redesign keeps the component API and data flow intact and scopes the new layout around its existing result markup.

## Rollback / fallback

The previous visual pass remains in Git history at commit `c3528bb`. The new styling is isolated in `camera-redesign.css`, while the HeroUI dependency can be removed independently if the product chooses to keep the custom primitives.
