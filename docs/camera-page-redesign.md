# Camera Page Redesign

**Mode:** Redesign · Preserve
**Route:** `/camera` and `/assessments`
**Branch:** `feat/combined-model-results`

## Design read

- **Artifact:** Tablet-first clinical wound-image capture workflow.
- **Audience:** Doctors, nurses, and care-team members capturing evidence under time pressure.
- **Visual language:** Calm clinical operations UI with an explicit workflow rail, high-contrast action blue, and model output treated as reviewable evidence rather than a diagnosis.
- **Visual variance:** 4/10. The page changes hierarchy and composition, not product identity.
- **Motion intensity:** 2/10. Only loading feedback and restrained hover/focus states remain.
- **Information density:** 8/10. Patient context, capture controls, image evidence, model review, and save assignment remain visible in one workflow.
- **Asset dependence:** 4/10. The existing DiabCare logo is retained; clinical images remain real user-provided evidence or honest empty states.
- **Brand fidelity:** 8/10. The page now shares the approved v0 clinical token system and Atkinson Hyperlegible typography.

## Positioning questions

- **Narrative role:** Move from safe patient selection to evidence capture, then to clinician-reviewed model output and record assignment.
- **Viewing distance:** 60–90 cm on a tablet. Body copy starts at 17–20px and key controls use 48px-plus targets.
- **Visual temperature:** Calm during capture, amber for review-required states, red only for camera or data errors.
- **Capacity check:** On tablet, the selected patient, three-step rail, camera surface, primary capture controls, and review panel share the first meaningful view. On mobile, the panels stack in workflow order.

## Before-and-after plan

### Preserve

- Existing route paths `/camera` and `/assessments`.
- Patient search, diabetes-context filters, patient selection, and confirmation behavior.
- Browser camera permission handling, secure-context checks, live video, frame capture, upload fallback, preview reset, and object URL cleanup.
- Inference mutation payload, confidence threshold, per-region results, segmentation overlays, overlay toggles, and model disclaimer.
- Wound-assessment selector, capture date/time field, save mutation, toast feedback, and diagnostic photo history.
- English/Thai copy and existing translation keys.
- Accessibility behavior: labels, live regions, keyboard-close help dialog, focus states, disabled states, and explicit empty/error messages.

### Improve

- Replace the former compact green/blue visual layer with the approved blue clinical system.
- Add a visible three-step workflow rail so the next action is always clear.
- Promote selected patient context into a persistent banner before the camera opens.
- Increase typography, spacing, control heights, and camera frame proportions for tablet use.
- Make model output visually subordinate to clinician review while preserving all technical result detail.
- Add responsive rules for stacked mobile panels and a consistent 48px control rhythm.

### Remove

- Decorative gradients and soft shadows that made the capture surface read like a marketing card.
- Tiny uppercase labels that carried important workflow meaning without enough supporting hierarchy.
- The old visual mismatch between the camera page and the approved v0 dashboard system.

## Protected contracts

No backend, database schema, API, route, form field, mutation payload, local state key, inference model contract, or clinical disclaimer was changed. The redesign changes presentation and component composition only.

## Highest-risk change

The highest-risk area is the overlay and model-result layout because `WoundInferenceResults` is shared behavior. The redesign keeps its class API and data flow intact, then applies scoped camera-page styles around it instead of rewriting inference logic.

## Rollback / fallback

The previous visual layer remains in Git history at the parent commit. If review rejects the new layout, revert the camera page and `camera-redesign.css` while retaining the shared token extraction, which is behavior-neutral.
