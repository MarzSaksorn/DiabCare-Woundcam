# DiabCare WoundCam — Product Requirements Document

| | |
|---|---|
| Version | 0.1 (draft for team review) |
| Date | 2026-09-15 |
| Owner | diab-orchestrator |
| Status | Rebuild-clean decision locked by Saksorn; prototype = design reference only |
| Inputs | Research Day 1: competitor teardown, stack plan, capture-UI de-risk, patient schema, escalation model, reference-app teardown + feature inventory, hospital EMR dataset study |

---

## 1. Overview

**Product.** A Thai-first progressive web app (PWA) through which diabetic patients — or their caregivers — capture standardized, comparable wound photos at home, and clinicians review healing trends and respond inside a closed two-way loop.

**Problem.** Diabetic wounds (especially diabetic foot ulcers) require frequent monitoring, but clinic visits are sparse. Home photos are blurry, angled, and non-comparable, so healing trends are unreadable. Existing products (Swift Medical, Net Health Tissue Analytics, Healthy.io Minuteful, eKare inSight, MyFootCare) are clinician-operated, enterprise-licensed, or one-way patient cameras with a weekly phone call.

**Value proposition.**
1. Guided, standardized home capture — fill-frame calibration + ghost-overlay alignment let a 70-year-old produce clinic-grade comparable photos with zero training.
2. Closed two-way loop — deterioration alerts and fast clinician response in-app, not a weekly phone call.
3. Caregiver mode as a first-class citizen — caregiver-submitted captures and reports are first-class data, weighted equally.

**Business direction.** Home patients first; monetize via clinics/payers. Patients never pay out of pocket (per eKare pilot data, only ~6% would).

## 2. Goals and Non-Goals (v0.1)

**Goals (v0.1 must ship):**
- G1. A patient/caregiver can capture a wound photo that passes an in-app quality check and is accepted into the wound record.
- G2. A clinician can see every wound's chronological photo trajectory and side-by-side comparison.
- G3. All clinical data lives server-side (Postgres + R2) with consent gating and an audit trail — nothing clinical in the browser.
- G4. Thai/English UI, Thai-first (Sarabun).

**Non-goals for v0.1** (contract against scope creep):
- EHR/FHIR integration, AI wound-area measurement, multi-tenant organizations, analytics dashboards, offline sync, billing/payments, native apps, PDF reports, audit-log UI (raw audit table only).

## 3. Users and Personas

| Persona | Context | Key needs |
|---|---|---|
| **Patient** (primary) | Elderly, low tech literacy, possible impaired vision/dexterity | Zero-instruction capture; reassurance copy; sub-minute self-reports |
| **Caregiver** (primary, first-class) | Family member; ~60% of successful home scans are caregiver-done | Same flows as patient + "Reporting for" attribution |
| **Clinician / nurse** | Reviews between visits, responds to alerts | One-line actionable alerts; trend view; fast disposition |
| Clinic admin (v0.3+) | Manages staff/patients | Deferred |

## 4. Scope by Release

**v0.1 — Capture loop core**
- Auth (login/logout, JWT with `patient`/`clinician` scopes)
- Patients: add, list, search, profile (personal + clinical subset)
- Wounds: record with location/laterality, anchored timeline
- Capture → Review → Accept loop with guided camera
- Wound list with side-by-side compare
- Two-phase secure upload, server-side validation
- Consent gate, audit table, Thai/EN i18n, toasts

**v0.2 — Intelligence + loop closure**
- AI classification via backend inference proxy
- Deterioration escalation model (triggers, alerts, triage tiers)
- Patient self-report flow (pain, infection signs, weekly weight/swelling)
- Caregiver-mode submission tagging

**v0.3 — Clinical depth**
- PDF reports with photo evidence sections
- Bulk EMR import into `patient_clinical` extension table (vitals, labs, comorbidities, meds — with provenance)
- 60-day period analytics (query-time bucketing vs first-photo anchor)
- Healing-risk stratification model; engagement-risk handling

## 5. Functional Requirements

### FR-AUTH — Identity
- FR-AUTH-1: Users authenticate; JWT carries role scope `patient` or `clinician`. v0.1: clinician accounts are provisioned; no self-registration for clinicians.
- FR-AUTH-2: Patient binds to the app via clinician-issued enrollment (v0.1: clinician creates patient record; patient device logs in against it).
- FR-AUTH-3: Logout invalidates session server-side.

### FR-PAT — Patients
- FR-PAT-1: Patient record stores: internal ULID `id`, external `mrn` (unique), `consent` flag (**required true before any photo upload**), `dob` (or `age_years` if DOB unavailable), `sex`, `dm_type` (enum type1/type2/gdm), `dm_onset` date, `identify_by` (enum medication/icd10/lab), `hba1c` (single manual field, optional), timestamps.
- FR-PAT-2: Clinician can add/edit patients; patient list supports search by name/MRN.
- FR-PAT-3: All patient edits write to the audit table (actor, field, old, new, at).

### FR-WND — Wounds
- FR-WND-1: Wound record: `id`, `patient_id` FK, `location` (enum: foot_plantar/foot_dorsal/heel/toe/lower_leg/other), `laterality` (left/right/na), `status` (open/healing/closed/amputated), `notes`.
- FR-WND-2: `first_photo_at` anchor = timestamp of the **first validated photo** (passed `/complete` integrity check), never the first upload attempt.
- FR-WND-3: Re-baselining stores `effective_anchor_at` override; original anchor and all history are never rewritten.

### FR-CAP — Guided capture (capture-first)
- FR-CAP-1: Camera-first screen: viewfinder is the screen; one large shutter button; wound-type selectable as large tappable chips.
- FR-CAP-2: Fill-frame guide: dashed outline sized for a calibration (ruler) sticker; when the sticker fills the outline, capture distance is correct.
- FR-CAP-3: Ghost overlay: last accepted photo for the same wound rendered at ~30% opacity for angle/crop matching by alignment, not memory.
- FR-CAP-4: Single green check state (in frame + in focus + sticker visible) enables the shutter; any failing element is highlighted in red on the outline itself.
- FR-CAP-5: Capture metadata is automatic: timestamp, wound ID, capturedBy (name + role), capture method. No manual typing during capture.
- FR-CAP-6: The flow must be completable with zero written instructions (UI shows the end state; no onboarding text screens).

### FR-REV — Review
- FR-REV-1: After shutter, full-width photo with overlay checklist (in focus? ruler in frame? lighting OK?).
- FR-REV-2: Two pinned bottom actions ≥44px: Retake / Accept. **Nothing persists until Accept.**
- FR-REV-3: On Accept, a one-line comparison chip reinforces teaching: e.g. "Aligned with last photo ✓ · 2.1 cm framing ✓" (v0.1: heuristic; real area analytics at v0.3).

### FR-LST — Wound list & compare
- FR-LST-1: Wound list: reverse-chronological cards per wound (thumbnail, date, status chip).
- FR-LST-2: Card tap → side-by-side compare with the previous accepted photo.
- FR-LST-3: Clinician view shows all patients' wounds; patient view shows own only (scope-enforced server-side).

### FR-UPL — Secure upload pipeline
- FR-UPL-1: Two-phase: `POST /v1/wounds/{woundId}/photos/upload-ticket` returns a presigned PUT (HMAC-signed, single-use intent, 5-minute expiry, content-length + content-type pinned in signature); binaries never touch the API server.
- FR-UPL-2: `POST /v1/photos/{photoId}/complete`: server verifies the object landed, sniffs MIME by magic bytes (never extension), enforces 10 MB cap, strips EXIF server-side, stores sha256 (dedupe + integrity), writes the photo row.
- FR-UPL-3: `GET /v1/photos/{photoId}` returns a short-lived presigned read URL.
- FR-UPL-4: Storage: Cloudflare R2, bucket `woundcam-photos`, key `patients/{patientId}/wounds/{woundId}/{YYYY-MM}/{ULID}.jpg`. Server generates keys; client filenames are never trusted.
- FR-UPL-5: Wound-ownership check (JWT scope → patient → wound) before issuing any ticket or read URL.

### FR-AI — Classification (v0.2, backend proxy)
- FR-AI-1: Single endpoint `POST /v1/photos/{photoId}/classify`. Server holds provider keys (Roboflow DFU detection `diabetic-foot-ulcer/4`, wound-segmentation `wound-segmentation-dfu/1`, or successor); keys never reach the browser.
- FR-AI-2: Responses normalized to one internal schema; result stored against the photo row (classifications table: model_id, provider, result JSONB, latency).
- FR-AI-3: Cache key = photo sha256 + model_id (re-classification is a DB hit, not an API call). Retry/timeout policy per provider; provider failure degrades gracefully.
- FR-AI-4: Exposed keys from the reference prototype are treated as burned; all production keys are new and server-side only. *(Operator action pending — see §12.)*

### FR-ESC — Escalation (v0.2)
- FR-ESC-1: Trigger set: HbA1c rise ≥0.5% period-over-period; new insulin initiation; CKD stage progression; new HF or stroke event. Excluded by design: FPG, SBP (noise → alert fatigue).
- FR-ESC-2: Alert payload (one per period, max 4 trigger rows): signal + delta ("HbA1c 7.1→8.0, 90 days"); wound context (site, photo trend healing/stalled/worsening with % area change per week, days since last in-person review, last self-report flags); one pre-written suggested action per tier; one-tap dispositions — Acknowledge · Schedule visit · Mark false positive (false-positive taps are tuning data; dismissal <5 s).
- FR-ESC-3: Triage tiers (exactly three): photo deterioration + any lab trigger → immediate clinician alert; infection self-report flags alone → 24 h nurse callback; everything else → next scheduled visit.
- FR-ESC-4: Edge cases: no lab data → evaluate on photo trend + self-reports (never suppress for missing data); silent patient (≥3 missed daily reports on an active wound) → nurse outreach tier, not automated alarm; 2 failed outreach attempts → engagement-risk tag; conflicting signals → photo wins for wound escalation; multiple triggers → one merged alert, tier = highest single trigger; patient/caregiver contradiction → trust the infection-sign reporter, flag discrepancy for the nurse script.
- FR-ESC-5: Trigger evaluation runs on data ingestion (labs/events land → evaluate); alert delivery table (sent/acked/false-positive) enables precision measurement from day one.

### FR-REP — Patient self-report (v0.2)
- FR-REP-1: Flow (each screen <1 min): S0 daily push at patient-chosen time (default 19:00 post-dressing; tap opens, no login) → S1 pain 0–10 slider with emoji anchors → S2 five yes/no infection cards (odor, pus, spreading redness, more warmth, fever/chills; "yes" on spreading redness or fever fast-tracks triage) → S3 guided photo (weekly, same calibration flow, skippable-but-logged) → S4 weekly weight + ankle swelling (none/a bit/a lot; last value shown) → S5 close-the-loop confirmation + streak (mandatory; silent submissions kill adherence).
- FR-REP-2: Caregiver mode: identical screens with persistent "Reporting for: [Patient]" toggle; submissions tagged `by_caregiver` and weighted equally.

### FR-PLT — Platform
- FR-PLT-1: Thai-first bilingual UI (Thai/English), Sarabun typeface; all copy per Writer tone rules (§6.3).
- FR-PLT-2: Toast pattern for save confirmations; notifications for self-report nudges.
- FR-PLT-3: Raw audit table from day one (no UI); every clinical mutation logged.

## 6. UX Requirements

**6.1 Flows (v0.1):** Enrollment → consent → capture (FR-CAP) → review (FR-REV) → wound list/compare (FR-LST).
**6.2 Zero-instruction rule:** the UI physically shows the desired end state; no tutorial screens.
**6.3 Tone rules (all patient-facing copy, TH + EN):**
1. Steady, not clinical — "Lay the ruler next to the wound, then fill the frame."
2. Never blame the patient — describe the photo, not their skill — "Photo came out blurry — hold steady and try again."
3. Reassure before you explain — "Your photo is safe. The upload hiccuped — tap to retry."

## 7. Non-Functional Requirements

- NFR-SEC-1: TLS everywhere (Cloudflare edge); origin IP hidden; rate limiting at edge.
- NFR-SEC-2: No clinical data in browser storage; server is the sole source of truth.
- NFR-SEC-3: All provider keys server-side (env/secrets); the client bundle contains zero secrets.
- NFR-COMP-1: Thai PDPA-grade consent flow before first upload; consent flag schema-enforced.
- NFR-COMP-2: Audit trail for every clinical mutation (append-only raw table).
- NFR-DUR-1: Photos in R2 (off-VPS durability); Postgres nightly managed backups; MinIO-on-app-box is vetoed.
- NFR-PERF-1: Capture → accepted-in-record under 30 s on a mid-range Android over 4G.
- NFR-A11Y-1: Touch targets ≥44 px; large-type patient screens; high-contrast states.
- NFR-OPS-1: One VPS + Docker Compose + Nginx; no Kubernetes; 3 a.m. debuggability is the bar.

## 8. Architecture Summary

- **Client:** React PWA (rebuild clean; no Redux — server-state hooks), Sarabun, Thai/EN.
- **Edge:** Cloudflare (TLS, rate limit, origin hiding) → Nginx on VPS → Docker Compose services.
- **API:** Express-compatible service; endpoints per FR-UPL/FR-AI; JWT auth.
- **Data:** Postgres (patients, wounds, photos, classifications, audit, self-reports v0.2, alerts v0.2) + Cloudflare R2 photo bucket.
- **Storage schema highlights:** photo table (`r2_key`, `sha256`, `captured_at` device clock, `received_at` server clock — authoritative, `exif_stripped`, `classification_id`); `wound_periods` as a query-time view: `period = floor(days_since(first_photo_at)/60)` (hospital 60-day pattern, re-anchored on first capture).
- **Deferred schema:** `patient_clinical` extension table keyed by MRN with `source` (emr_import/manual) + `effective_date` columns; meds stored as rows (drug, start, stop), not columns.

## 9. Success Metrics

- M1 (v0.1 gate): ≥60% of home captures usable on first-or-second attempt (clinician-rated; the guided UI is the test of our riskiest assumption).
- M2: capture-to-accepted-in-record median < 30 s.
- M3 (v0.2): alert precision — false-positive rate below agreed threshold (measured from disposition taps).
- M4 (v0.2): self-report adherence — ≥5 reports/week on active wounds.

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Non-comparable home photos (distance/angle drift) | FR-CAP-2/3 fill-frame + ghost overlay; M1 gate |
| Alert fatigue | 3 fixed tiers; noisy signals excluded (FR-ESC-1); false-positive tuning loop |
| Compliance exposure | Consent gate before upload; audit table; no PHI in browser; provenance columns in v0.3 import |
| Scope creep | §2 non-goals are contractual; deferred features land via extension tables only |
| AI provider outage | Backend proxy with retries/timeouts, cache by sha256, swappable providers |
| Key leakage (reference prototype) | Treat exposed keys as burned; rotate; server-side secrets only |

## 11. Milestones

1. **PRD sign-off** (this document + team review round).
2. **v0.1 build** — capture loop, upload pipeline, wound list (Forge + Canvas + Writer parallel tracks; Scribe ships capture protocol doc).
3. **Capture study** — concierge test against v0.1 (10–15 patients, 2 weeks; validates M1).
4. **v0.2 build** — AI proxy, escalation model, self-report flow.
5. **v0.3 build** — reports, EMR import, risk stratification.

## 12. Open Items

- **OI-1 (operator):** rotate the Roboflow/diabcare keys exposed in the reference bundle (treat as burned) — pending Saksorn.
- **OI-2 (Scribe):** draft the 8-section Photo Capture Protocol once capture specs freeze.
- **OI-3 (Log):** changelog automation on Conventional Commits + SemVer tags (repo initialized; wiring pending).
- **OI-4 (research):** actual 100-record hospital sample is not in the public repo (dictionary + briefing only); statistical pass pending data file.
