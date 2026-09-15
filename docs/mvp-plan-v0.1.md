# WoundCam — MVP Plan v0.1 (Research Day 1, 2026-09-15)

Compiled by diab-orchestrator from Round-1 research briefs (spark, forge, canvas, writer, scribe). Source excerpts in `/tmp/research_*.txt`.

## Product thesis
A home wound-photo tracker where patients/caregivers capture clinic-grade comparable photos with zero training, and clinicians review + respond in a closed loop.

## Market pick (spark)
- Target **home patients first**; monetize via clinics/payers, never patients.
- Competitor gaps we own:
  1. Guided, standardized home capture (fill-frame + ghost-overlay alignment).
  2. Closed two-way loop: deterioration alerts + fast clinician response in-app.
  3. Caregiver mode as a first-class citizen (60% of successful home scans are caregiver-done).
- Competitive set: Swift Medical, Net Health Tissue Analytics, Healthy.io Minuteful, eKare inSight, MyFootCare — all clinician-side, enterprise-licensed, or one-way.

## Stack (forge)
- **App:** PWA (no store review, fast iteration, getUserMedia is sufficient). Native only if background upload / offline capture becomes a requirement.
- **Infra:** 1 VPS + Docker Compose + Nginx, Cloudflare in front (TLS, rate limit, origin hidden). No Kubernetes.
- **Storage:** Cloudflare R2 (S3 API, zero egress, off-VPS durability). Veto: MinIO on the app box — single-disk patient data is a liability. *(Forge self-corrected from his earlier MinIO standup suggestion.)*
- **DB:** Postgres on VPS, nightly managed backups. One DB, strict schema.
- **Deferred past MVP:** EHR/FHIR, AI wound measurement, multi-tenant orgs, analytics dashboards, offline sync queue, audit-log UI (keep raw audit table).

## Capture UI de-risk (canvas)
- Riskiest mechanic: **distance/angle consistency** — silently ruins comparability.
- Fix: fixed-distance fill-frame guide sized for a ruler sticker; 30%-opacity ghost overlay of last accepted photo for angle/crop matching; single green check = go; red highlight names the failing element.
- Zero-instruction rule: UI shows the end state, no onboarding text.
- Review screen teaches: post-accept chips like "Aligned with last photo ✓".

## Tone rules (writer)
1. Steady, not clinical — "Lay the ruler next to the wound, then fill the frame."
2. Never blame the patient — "Photo came out blurry — hold steady and try again."
3. Reassure before you explain — "Your photo is safe. The upload hiccuped — tap to retry."

## Backend API (forge, from standup)
- `POST /v1/wounds/{woundId}/photos/upload-ticket` → presigned PUT (HMAC, single-use, 5-min expiry, content-length/type pinned).
- `POST /v1/photos/{photoId}/complete` → verify object, sniff MIME by magic bytes, strip EXIF, 10 MB cap, sha256 dedupe, write Postgres row.
- `GET /v1/photos/{photoId}` → short-lived presigned read URL.
- Keys: `patients/{patientId}/wounds/{woundId}/{YYYY-MM}/{ULID}.jpg`. JWT scopes: patient/clinician.

## MVP v0.1 scope
3 screens: Capture → Review (nothing saves until Accept) → Wound list with side-by-side compare. Two-phase upload per above. Caregiver mode = shared login note, full feature gate deferred.

## Docs (scribe)
Photo Capture Protocol outline: Purpose & Scope / Equipment & Setup / Patient Preparation / Standard Views & Distances / Lighting & Exposure / Hygiene & Safety / Labeling & Metadata / Quality Check & Retake Criteria.

## Repo conventions (log)
Git + SemVer tags (`v1.0.0`), Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).

## Reference prototype teardown (2026-09-15)
Saksorn's reference: https://diab-care-wound-cam-mtn-inventor-pc.vercel.app/ — React/Redux SPA, Thai+English UI (Sarabun), patient dashboard/search, camera capture with metadata (method/time/capturedBy), wound assessment (status/severity/area/trend/healingRateText), evolution history, PDF reports, login. AI: Roboflow DFU detection + wound-segmentation models + 2 diabcare endpoints, **keys exposed in client bundle**. All data client-side, no backend.

Team verdicts:
- **Canvas:** adopt capture-metadata model, Thai/EN i18n, toast pattern. Redesign camera tab to capture-first (viewfinder + fill-frame + ghost overlay, metadata auto-filled). Restructure profile (wound history front). **Cut for v0.1:** PDF reports.
- **Forge:** **rebuild, salvage selectively** — do not fork. Client-side persistence + exposed keys are unshippable clinically. Rotate Roboflow/diabcare keys now. Productionize AI via one backend proxy `POST /v1/photos/{id}/classify` (server holds keys, normalizes schemas, caches by photo sha256, retries/timeouts per provider). Client-side data confirms R2+Postgres plan; prototype data is throwaway, no migration.

Plan refinements:
- AI wound classification moves from "deferred" to **v0.2 via server-side proxy** (not client calls).
- Thai-first UI is a v0.1 requirement, not an afterthought.
- Prototype UX patterns (capture metadata, toasts) are salvage inputs for Canvas's build brief.

## Feature inventory (extracted from reference bundle, 2026-09-15)
1. Auth: login/logout, user session.
2. Dashboard: total patients, total wound records, security-classification badge, patient search.
3. Patients: list, add patient, profile with personal + general clinical sections (diabetes type).
4. Camera capture: camera tab, native camera, take photo; metadata = capture method, date, time, capturedBy name + role.
5. Wound assessment: wound status/type (Thai labels), severity, area, trend, healing-rate text; classification categories: infected / necrotic / non-DFU.
6. AI: wound prediction (predict_wound), diabcare RGB model settings, system AI config, Roboflow DFU detection + wound segmentation.
7. History: wound evolution history, progress logs, last-visit date, healing rate over time.
8. Reports: photo evidence sections, real-photo section, PDF export.
9. Settings tab; notifications (new + toasts); Thai/English i18n (Sarabun).
10. Report document structure: (1) Patient Profile, (2) Wound Imaging Evidence, (3) AI CV Wound Assessment Summary, (5) Home Care Evolution History & Progress Logs.

## Hospital dataset study (bdi-hackathon-2026, 2026-09-15)
Source: `anonymaew/bdi-hackathon-2026-sampled-dataset/diabetes` — longitudinal EMR extract, Srinakarin Hospital KKU. ~70,000 diabetes patients (100 sampled; T1 ~2k, T2 ~50k, unknown ~20k). Records split into 60-day Periods (P) anchored on diagnosis date `dm_onset` (P=-1 pre, P=0 per, P=1+ post). Fields per period: vitals (resp, o2sat, temp, hr, ht, wt, bmi, sbp, dbp), labs (fpg, hba1c, cpeptide, wbc, platelet, hemoglobin, lipids, thyroid, troponin, proBNP), comorbidities (arrhythmias, AF, CAD, dementia, HF, stroke, HTN, CKD), meds (metformin, insulin, dapagliflozin, semaglutide, sitagliptin). NOTE: repo ships only the data dictionary + briefing (both Git LFS); the 100-record sample itself is not in the folder.

Product implications:
1. **Patient schema grounding (forge):** adopt these as optional clinical-context fields on the patient profile — age, sex, dm type (type1/type2/gdm already maps to our profile), dm_onset date, latest HbA1c/FPG, comorbidity flags (CKD + stroke are wound-healing-relevant), current meds. v0.1 stores the subset; full EMR mapping is v0.3+.
2. **Longitudinal pattern:** anchor-based period windows (event + ±60d buckets) validate our wound-timeline model — apply the same anchor concept to wound baseline photos (periods anchored on first capture).
3. **v0.3 ML opportunity (spark):** healing-risk stratification using HbA1c, hemoglobin, CKD/HF comorbidities — powers the escalation-alert clinician loop; this dataset is a template for the feature set clinicians expect.
4. **Compliance:** real hospital-derived EMR — product must ship Thai PDPA-grade consent, de-identification for analytics, and audit trails from day one (raw audit table already planned).

### Forge — field mapping (v0.1 schema)
- Patient record (6 fields): MRN/patient ID, age/DOB, sex, dm type flags (type1/type2/gdm), dm_onset, identify_by + consent flag (schema-required).
- Wound record anchors the timeline: wound ID, body location, laterality, `first_photo_at` = first VALIDATED photo (passed /complete check), not first attempt. Re-baseline via `effective_anchor_at` override — never rewrite clinical history.
- Periodization: per-photo trajectory in storage; 60-day buckets computed at query time (`floor(days_since(first_photo_at)/60)`) — reporting construct, not storage.
- Deferred to v0.3+ (bulk EMR import with provenance, not manual entry): vitals, labs, comorbidities, med list → `patient_clinical` extension table keyed by MRN with source + effective-date. Early exception: single manual `hba1c` field (strongest healing covariate, first demo question).

### Spark — escalation model (v0.2)
- Triggers: HbA1c rise ≥0.5% period-over-period, new insulin initiation, CKD progression, new HF/stroke events. Excluded: FPG + SBP (noisy, alert fatigue).
- Alert content: one line per trigger — signal, delta vs prior period, wound trend (healing/stalled/worsening), days since last review.
- Patient self-report between visits: pain (0-10), infection signs (odor/pus/spreading redness — yes/no taps), weekly weight/ankle-swelling.
- Triage tiers: photo deterioration + lab trigger → immediate clinician alert; infection flag alone → 24h nurse callback; else next visit. Three tiers only.

### Spark — escalation model detail (v0.2 spec, 09:08)
- **Alert payload (clinician):** max 4 trigger rows (signal + delta, e.g. "HbA1c 7.1→8.0, 90 days"); wound context (site, photo trend with % area change/week, days since last in-person review, last self-report + flags); one pre-written suggested action per tier; one-tap dispositions Acknowledge / Schedule visit / Mark false positive (false-positive taps = tuning data; alert dismissible <5s).
- **Self-report flow:** S0 daily push at patient-chosen time (default 19:00, no login) → S1 pain 0-10 slider with emoji anchors → S2 five yes/no infection cards (odor, pus, spreading redness, warmth, fever/chills; yes on redness-spread or fever fast-tracks triage) → S3 guided photo weekly, skippable-but-logged → S4 weekly weight + ankle swelling (none/a bit/a lot) → S5 close-the-loop confirmation + streak (non-negotiable; silent submissions kill adherence). Caregiver mode: identical screens + "Reporting for" toggle, weighted equally.
- **Edge cases:** no lab data → run on photo trend + self-report, never suppress on missing data. Silent patient (≥3 missed dailies on active wound) → P2 nurse outreach, not automated P1; 2 failed attempts → engagement-risk tag. Conflicting signals → photo wins for wound escalation; photo healing + labs worsening = P2 review only. Multiple triggers → one merged alert, tier = highest single trigger. Caregiver/patient contradiction → trust the infection-sign reporter, flag discrepancy.
- **Schema needs from Forge (v0.2 blockers):** patient-period clinical table with start/end dates; event log not booleans (insulin start, HF/stroke diagnosis dates); unified patient_id across labs/photos/self-reports; per-capture photo-analytics output (area + trend); self-report event store + daily missed-report rollup; trigger-evaluation hook on ingestion + alert delivery table (sent/acked/false-positive) for precision tracking from day one.

## Gates & open decisions
1. **Gate #1 (unresolved):** run spark's concierge capture study (10-15 patients, 2 weeks, printed instructions, ~60% usability threshold) OR accept canvas's guided-capture UI as sufficient de-risk for v0.1 and study later. → Saksorn decides.
2. Confirm billing direction: clinics/payers, not patients.
3. Create the repo so log can wire changelog conventions from commit #1.
4. Confirm rebuild-with-salvage vs fork of the reference prototype (PM + forge lean: rebuild).
