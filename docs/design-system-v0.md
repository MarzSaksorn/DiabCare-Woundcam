# DiabCare WoundCam Design System v0

**Status:** Review prototype only
**Branch:** `feat/combined-model-results`
**Latest base commit:** `aeef580`
**Route:** `/design-system`

## Design read

- **Artifact:** Tablet-first clinical dashboard and workflow shell prototype.
- **Audience:** Doctors, nurses, and care-team members working under fatigue and time pressure.
- **Visual language:** Institutional data-first interface with a calm blue clinical anchor, explicit status colors, flat surfaces, and strong scanning rhythm.
- **Mode:** Exploratory v0 beside the existing product. Existing routes, APIs, data contracts, and clinical workflows remain unchanged.
- **Constraints:** Frontend-only, WCAG-minded contrast, touch-first interaction, bilingual product context, real DiabCare logo asset, no fabricated backend behavior.

### Five dials

| Dial                | Value | Concrete consequence                                                                                         |
| ------------------- | ----: | ------------------------------------------------------------------------------------------------------------ |
| Visual variance     |  3/10 | Stable left navigation, familiar cards, no decorative hero treatment.                                        |
| Motion intensity    |  2/10 | Short state feedback only; reduced-motion rules are included.                                                |
| Information density |  8/10 | Metrics, review queue, worklist, and evidence summary share the first viewport.                              |
| Asset dependence    |  3/10 | The real logo is used; clinical image areas remain honest placeholders.                                      |
| Brand fidelity      |  7/10 | DiabCare identity and clinical safety language remain visible while tokens move to the supplied blue system. |

## Positioning questions

- **Narrative role:** Operational overview first, then prioritized patient review and wound evidence.
- **Viewing distance:** Approximately 60–90 cm on an iPad or tablet. Body text stays at 20px in the prototype.
- **Visual temperature:** Calm, authoritative, and alert only when a status truly requires attention.
- **Capacity check:** The first viewport carries one page header, four metrics, a review queue, and a worklist without relying on hover or hidden menus.

## Design decisions

### Color tokens

| Role           | Token                | Value     | Use                                                    |
| -------------- | -------------------- | --------- | ------------------------------------------------------ |
| Primary action | `clinical-blue`      | `#0369A1` | Main actions, active navigation, focus emphasis.       |
| Primary dark   | `clinical-blue-dark` | `#075985` | Active text and accessible blue-on-light combinations. |
| Canvas         | `clinical-canvas`    | `#F8FAFC` | Page background to reduce glare.                       |
| Surface        | `clinical-surface`   | `#FFFFFF` | Patient cards, panels, and charts.                     |
| Text           | `clinical-text`      | `#0F172A` | Primary reading and metric text.                       |
| Muted text     | `clinical-muted`     | `#475569` | Supporting descriptions and metadata.                  |
| Critical       | `clinical-critical`  | `#DC2626` | Critical vitals and urgent warnings only.              |
| Warning        | `clinical-warning`   | `#D97706` | Abnormal but stable metrics and review-needed states.  |
| Stable         | `clinical-stable`    | `#16A34A` | Normal vitals, completed tasks, and connected states.  |

Status colors always pair with text labels. Color alone never carries meaning.

### Typography

- **Family:** Atkinson Hyperlegible, self-hosted in `client/public/assets/fonts/atkinson`.
- **Headline:** 32px minimum in the responsive prototype, bold, 1.2 line-height.
- **Patient name:** 24px target, semibold/bold in dense row contexts.
- **Body:** 20px default, with 16–18px metadata where the hierarchy stays clear.
- **Metric:** 28px target, bold, reserved for numerical measurements and counts.

### Spacing and shape

- Base unit: 8px.
- Structural sequence: 8, 16, 24, 32, 48, 64px.
- Touch targets: 48px minimum for buttons, navigation, and icon controls.
- Patient cards: 24px target internal padding, 12px radius, 1px border.
- Buttons: 8px radius, minimum 48px height.
- Status chips: fully rounded.
- Elevation: flat borders by default; `0 8px 24px rgba(15, 23, 42, 0.06)` is reserved for grouping, not decoration.

### Atomic inventory

**Atoms**

- Primary and secondary buttons
- Icon button with visible label or accessible name
- Search field with label/placeholder
- Status chip and status dot
- Metric icon tile
- Avatar/fallback
- Focus ring

**Molecules**

- Patient row
- Metric card
- Worklist item
- Safety banner
- Evidence summary card
- Sidebar navigation item

**Organisms**

- Fixed clinical sidebar
- Tablet top bar
- Review queue panel
- Wound capture panel
- Patient registry panel
- Design-token preview panel

## v0 prototype assumptions

- The `/design-system` route is a review surface, not a replacement for existing routes.
- All patient names and codes shown in v0 are visibly de-identified placeholders.
- Clinical image and chart blocks are explicit placeholders; they don't imply connected data.
- Sidebar items switch between static v0 screens to make layout review possible. They don't call APIs.
- The v0 uses English copy so reviewers can assess the visual hierarchy first. Existing language context remains unchanged elsewhere.
- No backend, database schema, route handler, API, or server-side logic was modified.

## Review checklist

1. Can a clinician identify the next action in under three seconds?
2. Do critical and warning states feel distinct without relying only on color?
3. Does the 48px touch-target rule hold on tablet and mobile layouts?
4. Is the review queue dense enough for shift work without becoming noisy?
5. Should the full refresh keep the left navigation, or use a wider tablet rail?
6. Which existing screen should become the first production implementation after this v0?
