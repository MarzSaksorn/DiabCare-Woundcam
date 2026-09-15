# WoundCam v0.1 — Page Inventory (Draft)

| | |
|---|---|
| Version | 0.1 draft |
| Date | 2026-09-15 |
| Owner | diab-orchestrator |
| Source | PRD v0.1.1 (FR references below). This is the frontend contract: Canvas implements these pages; Writer fills the copy for every state listed. |
| Status | Pending Canvas validation at CP1 + Writer copy pass |

---

## Navigation Map

```
Login ──> role?
  ├─ Clinician ──> Clinician Dashboard ──> Add Patient
  │                                     └> Patient Profile ──> (creates wound) 
  └─ Patient ──> Consent Gate (first run) ──> Wound List (home)
                                    └> Wound Select/Create ──> Capture ──> Review ──> (Accept) ──> Wound List
(Caregiver v0.1: operates on the patient's device profile with a device-level "Reporting for" attribution toggle — FR-PLT-5; separate accounts defer to v0.2)
Wound List ──> Wound Detail/Compare (any role, scope-filtered)
Settings reachable from every page header
```

## Shared Components (used across pages)

- **CaptureGuide** — fill-frame dashed outline (ruler-sticker sized) + ghost overlay of last accepted photo (user-adjustable opacity, FR-CAP-8) + live outline warnings (red highlight per failing element, icon + text, never color alone).
- **StateChip** — status = icon + short text (WCAG 1.4.1). Used on cards, review, lists.
- **PhotoCard** — thumbnail, capture date, status chip, capturedBy (name + role).
- **Toast** — save confirmations; reassurance-first error copy (tone rule 3).
- **ConsentGate** — wrapper blocking photo features until `consent = true`.
- **LangToggle** — TH/EN switch, persists per device; TH is default.

---

## Page 1 — Login

- **Purpose:** authenticate; route by role.
- **Access:** public.
- **Contents:** app logo + name (TH first), identifier field (email/phone), password field, login button, role determined server-side by JWT scope (no role picker exposed), link: language toggle.
- **Actions:** login (JWT issue), failure → non-blaming error ("Sign-in didn't work — check your details and try again"), logout elsewhere invalidates session.
- **States:** idle / loading / error (inline, icon + text) / first-login invite redemption (patient sets password from clinician's one-time invite, FR-AUTH-2) / success → dispatch by scope.
- **FR refs:** FR-AUTH-1/2/3. **Copy notes:** Writer owns error strings.

## Page 2 — Consent Gate

- **Purpose:** PDPA-grade consent before any photo feature (NFR-COMP-1).
- **Access:** patient scope, first run + whenever `consent_version` bumps.
- **Contents:** consent document v1.0 (Thai first, EN toggle), plain language, no clinical jargon; version number + date shown; Accept / Decline buttons; note: what data is collected, who sees it, how to withdraw.
- **Actions:** Accept → writes `consent_records` (consent_at, version, method) + sets flag; Decline → blocked screen with withdrawal/re-consent info; withdrawal path available later from Settings.
- **States:** pre-consent (blocking) / accepted / declined / version-changed (re-consent).
- **FR refs:** FR-PAT-1, NFR-COMP-1. **Copy notes:** high-stakes screen — explicit copy spec (tone rule 4).

## Page 3 — Clinician Dashboard

- **Purpose:** clinician's entry: all patients, totals, quick actions.
- **Access:** clinician scope only.
- **Contents:** header (app name, lang toggle, logout), search field (name/MRN, FR-PAT-2), totals row (total patients, total wounds), patient list (PhotoCard-style rows: name, MRN, wound count, last capture date), prominent "Add Patient" button.
- **Actions:** search (live filter), tap row → Patient Profile, add patient, logout.
- **States:** loading / empty ("No patients yet — add your first"), search-no-match, error.
- **FR refs:** FR-PAT-2, FR-LST-3. **Copy notes:** empty states written, not defaulted.

## Page 4 — Add Patient (Enrollment)

- **Purpose:** create patient record + start consent (FR-PAT).
- **Access:** clinician scope.
- **Contents:** form fields exactly per FR-PAT-1: MRN (unique), DOB or age, sex, dm_type as three large chips (type1/type2/gdm), dm_onset date picker, identify_by selector, optional manual HbA1c field, consent enrollment section (shows consent doc v1.0 inline or hands device to patient → Consent Gate).
- **Actions:** save → audit row (FR-PAT-3), validation errors inline per field (icon + text), generate one-time invite (code/link) for the patient's first login (FR-AUTH-2), success toast + jump to Patient Profile.
- **States:** editing / field-error / saving / saved.
- **FR refs:** FR-PAT-1/2/3. **Copy notes:** no jargon on patient-facing side; clinician-facing may use clinical terms.

## Page 5 — Patient Profile (Clinician View)

- **Purpose:** one patient's clinical context + wounds.
- **Access:** clinician scope.
- **Contents:** identity header (name, MRN, age/sex), clinical subset block (dm_type, dm_onset, HbA1c, identify_by — layout ready for v0.3 `patient_clinical` extension), consent status chip (icon + text + version), wound list for this patient (PhotoCards), "Add Wound" button, capture history count.
- **Actions:** tap wound → Wound Detail, add wound → Wound Select/Create (clinician-confirmed path), edit patient fields → audit logged.
- **States:** loading / no wounds yet / error.
- **FR refs:** FR-PAT-1/3, FR-WND-1. **Copy notes:** —.

## Page 6 — Wound Select / Create

- **Purpose:** pick or create the wound record before capture (FR-WND-4 — the flow hole the PRD review caught).
- **Access:** patient/caregiver/clinician.
- **Contents:** grid of large body-part location tiles (foot plantar / foot dorsal / heel / toe / lower leg / other), laterality toggle (left/right/na), existing open wounds for this patient (tiles with thumbnails), "new wound" path highlighted.
- **Actions:** select existing → Capture with ghost overlay loaded from its last accepted photo; create new → creates record pending clinician confirmation, ghost overlay starts empty → Capture.
- **States:** no wounds (first-run: tiles only) / loading / error.
- **FR refs:** FR-WND-1/4. **Copy notes:** body-part names in plain Thai + English.

## Page 7 — Capture

- **Purpose:** the core: guided, standardized, comparable photo (FR-CAP).
- **Access:** consented patient/caregiver/clinician.
- **Contents:** full-screen viewfinder; CaptureGuide component (fill-frame outline for ruler sticker, ghost overlay at last accepted photo, live warnings: not-in-frame / not-in-focus / sticker missing / too dark / too bright — each icon + text on the outline); tissue-type chips below viewfinder (large tappable); one big shutter button; auto metadata bar (time, wound id, capturedBy — read-only); ghost opacity control.
- **Actions:** shutter enabled only when green check state; **quality check cannot confirm within 10 s → shutter force-enables, capture flagged `unverified`** (FR-CAP-7); retake loop internal; on shutter → hand off to Review.
- **States:** initializing camera / guiding / check-passed (green) / check-failed (per-element red) / force-enabled (flagged) / camera-permission-denied (explanatory, not blaming).
- **FR refs:** FR-CAP-1–9. **Copy notes:** zero-instruction rule — the UI shows the end state; no tutorial text; tone rules 1–2 live here.

## Page 8 — Review

- **Purpose:** accept or retake before anything persists (FR-REV).
- **Access:** same as capture.
- **Contents:** captured photo full-width; state chips (in focus / ruler visible / exposure OK — icon + text, or the unverified flag chip); two pinned bottom buttons ≥44 px: Retake / Accept; on Accept → one-line teaching chip (plain words or icon + number — "Aligned with last photo ✓"; no jargon).
- **Actions:** Retake → back to Capture (nothing saved); Accept → two-phase upload starts (ticket → upload → complete), progress state, success → toast "Your photo is safe ✅" + wound list; upload error → reassurance-first copy + retry (photo held client-side until accepted).
- **States:** reviewing / uploading / upload-error (retryable) / accepted.
- **FR refs:** FR-REV-1/2/3, FR-UPL-1/2. **Copy notes:** tone rule 3 (reassure before explain) lives in the upload-error state.

## Page 9 — Wound List (Patient Home)

- **Purpose:** patient's home: their wounds, reverse-chronological.
- **Access:** patient scope (own wounds only; server-enforced).
- **Contents:** header, wound cards: thumbnail, wound location label, latest photo date, status StateChip (open/healing/closed/amputated — icon + text, all four states incl. amputated), add-capture button per wound, add-new-wound tile, streak/reminder teaser placeholder (v0.2 slot).
- **Actions:** tap card → Wound Detail; capture again → Wound Select (preselected); logout.
- **States:** loading / no wounds (→ Wound Select) / error.
- **FR refs:** FR-LST-1/3. **Copy notes:** —.

## Page 10 — Wound Detail / Compare

- **Purpose:** healing trajectory + side-by-side comparison (FR-LST-2).
- **Access:** patient (own) / clinician (all) — scope-filtered.
- **Contents:** side-by-side view: latest accepted photo vs previous accepted photo; capture timeline (PhotoCards, chronological, each with capturedBy + time + unverified flag if any); wound status chip + location/laterality; clinician-only: status edit (open/healing/closed/amputated) + notes field; pending-confirmation banner if patient-created (FR-WND-4).
- **Actions:** compare toggle, tap timeline item → full photo, clinician status edit (FR-WND-5) and re-baseline anchor (FR-WND-3) — both audit-logged, capture new photo → Capture.
- **States:** single photo (no comparison yet — shows latest only with hint chip) / loading / error.
- **FR refs:** FR-LST-2, FR-WND-1/3, FR-CAP-7 (unverified display). **Copy notes:** hint chips plain-language.

## Page 11 — Settings / Profile (Minimal)

- **Purpose:** language, session, consent visibility.
- **Access:** any logged-in role.
- **Contents:** language toggle (TH/EN), my account (name, role), consent status + "view consent document" + withdrawal request entry (patient), logout button, app version (from Log's release automation).
- **Actions:** toggle language, request data export/withdrawal (v0.1: files a request record via FR-PAT-5; fulfillment automation v0.3, 30-day SLA draft), logout.
- **States:** —.
- **FR refs:** FR-AUTH-3, NFR-COMP-1 (withdrawal path). **Copy notes:** withdrawal copy must be plain and unafraid.

---

## State Matrix (shared rule)

Every list page: loading (skeleton) / empty (written empty state) / error (icon + text + retry). Every form: per-field inline validation. Every destructive/high-stakes action: confirm with plain-language copy. No state is ever communicated by color alone.

## Open Items for This Draft

- **Canvas:** validate at CP1 — component feasibility, ghost-overlay perf on mid-range Android, route structure.
- **Writer:** copy pass per page (states + actions listed above are the inventory to fill; TH authored natively).
- **Orchestrator:** fold accepted changes, then this file freezes as the frontend contract alongside the API contract (end of D2).
