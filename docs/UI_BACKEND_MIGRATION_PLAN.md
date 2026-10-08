# DiabCare: replace the old UI with the replica UI

**Date:** 2026-10-08

**Status:** Proposed implementation plan. No application integration or production change has been performed.

**Implementation target:** [MarzSaksorn/DiabCare-Woundcam: migration/replica-ui-backend](https://github.com/MarzSaksorn/DiabCare-Woundcam/tree/migration/replica-ui-backend)

**Replica reference:** [MarzSaksorn/DiabCare-WoundCam_Replicate-I-NewGen-Present](https://github.com/MarzSaksorn/DiabCare-WoundCam_Replicate-I-NewGen-Present)

**Replica baseline:** `5377c10f7690ca6c7ac0d6cb3f9772644a825887`

**Backend reference:** [MarzSaksorn/DiabCare-Woundcam](https://github.com/MarzSaksorn/DiabCare-Woundcam), commit `be8b2e92bf0ca568265026d758ae1dee8fdb0bbc`.

## 1. Decision and boundaries

**Replace the old presentation layer, not the working database or model.** Build a maintainable React/TypeScript implementation of the replica's blue/cyan, Thai-first UI. Connect it to the existing Express/tRPC services, Drizzle/PostgreSQL records, media storage, and local YOLO/ONNX inference.

Implement the migration on `migration/replica-ui-backend` in `MarzSaksorn/DiabCare-Woundcam`, as requested on 2026-10-08. Start from the existing backend and replace its presentation layer with editable replica components. Keep the separate replica repository as the frozen visual reference. Do not mix the old navy/sage design into the replacement UI. Keep `main` unchanged until a reviewed merge is explicitly authorized. This branch currently adds the migration plan only; application integration has not started.

Keep the current compiled copy as a frozen visual/interaction reference. Prefer recovering the original replica source from its owner before rebuilding. If no source is available, reconstruct editable components from the deployed UI and compare them against the reference.

**Do not patch the minified bundle, monkey-patch `fetch`, or spoof backend responses to make a demo look connected.** Those approaches leave synthetic patients, random predictions, and browser-local records behind.

### Preserve

- Replica logo, local fonts, mobile-first layout, blue/cyan visual identity, Thai/English content, header, and bottom navigation.
- Existing patient IDs, imported-source provenance, assessment/media relationships, and audit history.
- Existing tRPC procedure names and request/response contracts wherever possible.
- Existing ONNX model bytes and class order until separately reviewed.
- Existing OAuth/session behavior as the default authentication strategy.
- Existing database project and storage references. Do not duplicate clinical data into a new database.

### Change deliberately

- Replace demo login, generated patients, random model outputs, local clinical-record storage, simulated notifications, and misleading connectivity messages.
- Preserve old deep links through real routing or explicit compatibility aliases.
- Correct demonstrated backend security and persistence defects before production cutover.
- Add missing backend capabilities only through reviewed contracts and additive migrations.

### Authority boundaries

This plan authorizes no deployment, production schema change, production data write, new access grant, or history rewrite. Request explicit approval with the exact payload before any such action. Ordinary local development, tests, documentation commits, and review branches can follow the approved implementation scope.

## 2. What the audit established

These are **source-code findings**, not proof that live infrastructure is healthy.

| Area | Replica today | Existing backend | Integration implication |
| --- | --- | --- | --- |
| Editable UI | Hashed compiled JS/CSS; no `.tsx` source or source maps in the local copy | React 19 / TypeScript / Vite app | Recover or reconstruct source before reliable integration. |
| Authentication | Hardcoded demo users; selected role drives client state | Manus OAuth callback, session identity, `auth.me`, `auth.logout` | Keep the login appearance; replace the actual authentication behavior. |
| Roles | `OFFICER`, `nurse`, `CAREGIVER` | `users.role` supports `user` / `admin` | Clinical role/assignment enforcement needs a reviewed server-side model. |
| Patients | Application root calls a simulated patient generator | Imported cohort plus registered patient tables | Replace generator with authorized API queries. Never import the sample list as real patients. |
| Analysis | Function `sk` generates classes/confidence/other values with `Math.random()` | `wound.infer` runs the packaged ONNX detector on CPU | Remove mock analysis from connected mode, including random measurements and severity. |
| Local records | `diabcare_rgb_camera_brain_records` stores records in `localStorage` | Assessments, medication, media, and audit tables | Move authoritative clinical history to backend persistence. |
| Model settings | Browser-local mock mode and example cloud API fields | Fixed local ONNX model and threshold input | Use server configuration/status; no browser-stored private API keys. |
| Database | No real DB connection in the copied UI | Supabase PostgreSQL through `pg` + Drizzle | Connect through tRPC, not directly from the browser. |
| Images | Browser data URLs and local record references | Forge-managed S3 upload and `/manus-storage/*` redirect | Preserve provider initially, but protect delivery with patient access checks. |
| Reports | Built from demo/local analysis state | Patient export exists; structured inference persistence does not | Generate reports from persisted records and reviewed findings. |
| Appointments / alerts | Demo schedule, in-memory notifications | No appointment or persistent notification domain in inspected router/schema | Add reviewed contracts/tables or show honest unavailable states. |
| Thermal features | UI includes thermal and measurement-related surfaces | Companion integration guide exists; thermal procedures are proposals, not implemented APIs | Preserve the UI but disable unsupported clinical functionality until validated. |

### Verified model contract

- File: `server/models/diabetes-wound-detector.onnx`.
- SHA-256: `80055714a44b3df6e97371b69da74930a63e63ca51e138fe24a2a19fb71e6a02`.
- Metadata says `best.pt` was exported with Ultralytics 8.3.0.
- CPU runtime: `onnxruntime-node` 1.20.1; preprocessing: Sharp 0.33.5.
- Input: float32 RGB tensor `[1, 3, 640, 640]`, EXIF rotation, aspect-ratio-preserving padding, normalized by 255.
- Class IDs: `0 callus_corn`, `1 dfu_ulcer`, `2 infected_wound`, `3 necrotic_wound`, `4 normal_foot`.
- Default confidence: `0.25`; overlap suppression IoU: `0.45`.
- Existing decoder supports post-NMS `[1, 300, 6]` and raw `[1, 9, 8400]` / `[1, 8400, 9]` outputs.
- Returned fields: `model`, `task`, `disclaimer`, `detections`, and nullable `topSuggestion`.
- Detection coordinates are in the padded 640×640 input frame, not original-image pixels.

The replica also uses demo classes such as `normal_skin` and `non_dfu_wound`. Neither is an additional class supported by this detector. Do not silently equate `normal_skin` with `normal_foot`; render the real class label with reviewed Thai/English translations. A no-detection response is **inconclusive**, not a healthy-foot diagnosis.

### Live verification still required

This task environment has no configured database URL, JWT secret, OAuth server configuration, or Forge storage credentials. The Supabase connector is disabled. No live DB query, live storage test, current user-role audit, or deployed-model health check was performed.

The old README mentions historical record counts; its connection tests also expect empty imported datasets. Do not take either as a current production inventory. Several DB read helpers return empty arrays or zero counts when configuration is missing, so a passing test can mean “DB unavailable,” not “DB connected.”

## 3. Recommended architecture

```text
Browser: editable replica React/TypeScript UI
  ├─ server-backed session and permissions
  ├─ typed tRPC client + TanStack Query
  ├─ patient / assessment / capture / report view models
  └─ same-origin requests
           │
           ▼
Node 22 Express application
  ├─ /api/oauth/callback             existing authentication flow
  ├─ /api/trpc                      existing API gateway
  ├─ authorized media delivery      hardened storage route
  ├─ DB service                     Drizzle + pg
  │       └─ existing Supabase PostgreSQL
  ├─ media service                  existing object storage initially
  └─ wound inference service        local Sharp + ONNX Runtime CPU
          └─ exact existing YOLO model + label manifest
```

Prefer one HTTPS origin for UI and API. That avoids unnecessary CORS, credentialed cross-origin requests, and duplicated session logic. Initially keep inference in the Node server; split it into an internal worker only if measured memory, concurrency, or latency requires it. Limit simultaneous inference work and bound its queue.

The current Python static preview is a design/demo preview only. It cannot serve the old database, OAuth, or inference system. The connected app needs the full Node runtime and packaged native libraries/model files.

### Proposed repository layout

```text
client/src/
  app/                     routing, providers, session gate
  components/              replica visual components
  features/
    auth/
    dashboard/
    patients/
    camera/
    assessments/
    reports/
    settings/
  lib/                     typed API client, view-model adapters, locale helpers
server/
  _core/                   Express, context, auth, storage delivery
  routers.ts               preserved tRPC contracts + reviewed additions
  db.ts                    persistence + access checks
  woundInference.ts        model execution
  models/                  exact ONNX artifact + labels
shared/                    enums, constants, shared types
drizzle/                   schema and ORM types
supabase/migrations/       preserved history + additive reviewed migrations
reference/deployed/        frozen compiled replica snapshot
reference/screens/         baseline screenshots
```

Preserve the compiled snapshot outside the new build's public root so it cannot accidentally become the live connected application.

### Credentials and runtime

| Configuration | Scope / treatment |
| --- | --- |
| `SUPABASE_DATABASE_URL` | Server-only; use the existing project connection, session pooler for an IPv4-only persistent runtime. |
| `DATABASE_URL` | Legacy fallback; make unintended fallback fail clearly rather than silently connecting elsewhere. |
| `JWT_SECRET`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID` | Server-only auth configuration; preserve secret handling. |
| `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` | Public login configuration only, not database credentials. |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Server-side storage dependency; verify availability in the chosen deployment. |
| `LOCAL_AUTH_BYPASS` | Must be `false` in shared staging and production; reject production startup if enabled. |
| Model path / manifest | Server deployment artifact; not a client download or remote Roboflow call. |

Fix TLS certificate trust using the approved CA rather than preserving `rejectUnauthorized: false` as production policy. Keep database connection count within the actual project's budget. Keep secret values out of Git, client bundles, reports, and screenshots.

## 4. Screen-to-backend contract map

**Existing** below means present in the inspected code. **Proposed** means not implemented and must not be treated as available.

| Replica screen / action | Existing contract to reuse | Missing work / acceptance requirement |
| --- | --- | --- |
| Login, current user, logout | `auth.me`, `auth.logout`, `/api/oauth/callback` | Session gate; no hardcoded demo credentials in connected mode. Clinical role comes from the server. |
| Home dashboard | `diabetes.summary`, registered patients/assessments | Proposed dashboard aggregate for real registered-patient counts and reviewed trends; existing summary is an import summary, not appointment/healing metrics. |
| Imported cohort | `diabetes.patients`, `diabetes.detail`, `diabetes.observations` | Keep source-preserved data separate from named clinical records. Add server pagination/filtering. |
| Example dataset view | `diabetes.exampleBatches`, `diabetes.exampleRecords` | Preserve read-only access and provenance; do not present ML examples as clinical patients. |
| Clinical patient list | `diabetes.registeredPatients` | Paginated authorized list, search and empty/error/loading states. |
| Patient profile / record | `diabetes.registeredPatientRecord` | Includes patient, medications, assessments, media, audit, imported observations. Map nullable values truthfully. |
| Register / edit patient | `diabetes.registerPatient`, `diabetes.updateRegisteredPatient` | Validate code, age/date of birth, sex and diabetes context; duplicate-code feedback; correct audit identity. |
| Medication panel | `diabetes.addMedication` | Real mutation and refreshed patient record; no local-only save toast. |
| Wound assessment | `diabetes.addWoundAssessment` | Clinician review before save; no auto-generated diagnosis or fabricated measurements. |
| Capture / classify RGB image | `wound.infer` | Real request, permission/error/no-detection states, class labels and correct overlay transform. |
| Save image to patient | `diabetes.uploadWoundPhoto` | Confirm patient/assessment, verify MIME from bytes, persist capture timestamp and refresh history. |
| Photo history | `diabetes.photoHistory` | Date/patient filters, pagination, authorized storage access. |
| Hide / restore media | `diabetes.setWoundPhotoVisibility` | Backend permission and audit, role-aware rendering of hidden media. |
| Delete media | `diabetes.deleteWoundPhoto` | Reviewed deletion/retention policy; currently deletes DB metadata, not object bytes. Explicit user confirmation for destructive action. |
| Archive / restore patient | `diabetes.archivePatient`, `diabetes.restorePatient` | Preserve clinical history and audit; authorized actions and user confirmation for archive. Add authorized archived-list support if needed. |
| Export / reports | `diabetes.exportPatient` | Server-authorized persisted report payload; PDF uses real stored data and reviewed model results. |
| Notifications | `system.notifyOwner` is admin-only owner messaging, not a patient-alert feed | Proposed notification list/read APIs only if required; don't misuse owner messaging as the UI notification bell. |
| System status | `system.health` | Existing check returns `ok: true`; proposed restricted readiness verifies DB, storage, model without leaking secrets. |
| Settings | Existing session and model runtime, no settings CRUD | Proposed authorized preferences/status; remove browser private-key inputs and false API-save messages. |
| Appointment schedule | None in inspected router/schema | Proposed domain and reviewed schema, or explicit “not connected” state. No demo dates/counts in connected mode. |
| Thermal camera / Celsius | No implemented thermal API | Keep raw-preview capability distinct; only add calibrated upload/retrieval after companion/device validation. |

Preserve deep links `/patients/new`, `/patients/:id` for imported records, `/patients/registered/:id`, `/patients/registered/:id/edit`, `/camera`, `/assessments`, `/reports`, and `/settings`. Map the replica's internal `home`, `patients`, `camera`, `report` tabs to those routes without losing refresh/back-button behavior.

Use typed tRPC for current browser APIs, including `superjson` dates and credentialed session requests. Do not handcraft an assumed REST envelope. If a dedicated REST upload or companion API is introduced later, specify it in OpenAPI with authentication, validation, error codes, and versioning before implementation.

## 5. Database and record integrity

### Existing entities to retain

- `users`.
- `diabetes_import_batches`, `diabetes_patients`, `diabetes_patient_observations`.
- `diabetes_example_import_batches`, `diabetes_example_records`.
- `registered_patients`, `patient_medications`, `patient_wound_assessments`.
- `patient_wound_media`, `patient_record_audit_events`.

Keep the existing Supabase database and identifiers. Switching the UI is not a reason to recreate tables, re-import cohorts, or move clinical records. Compare actual schema/migration history read-only before adding anything.

### UI adapters

- Distinguish `registered:{id}` from `imported:{id}` in UI selection keys. Numeric IDs belong to different tables and can overlap.
- Keep `patientCode` / HN display codes separate from numeric database IDs.
- Only registered-patient IDs can own medications, assessments and wound media under the current foreign keys.
- Link imported observations through `registered_patients.importedPatientId`; never match by array index or guessed name.
- Display missing names, labs, risk scores and measurements as unavailable. Do not infer a patient identity from de-identified cohort rows.
- Return large identifier types safely; the current schema maps bigint to JS numbers, so enforce safe-integer bounds or introduce a deliberate string-ID contract if needed.
- Use UTC timestamps at the API boundary and localized display dates. Do not save Buddhist-calendar years as Gregorian dates.

### Proposed additive persistence

Design, review and migrate only when needed:

1. **Inference provenance:** a proposed `wound_inference_runs` table linked to patient/media, storing model ID/version/hash, threshold, detections, original dimensions, transform metadata, timestamp and actor. Separate raw suggestions from clinician-reviewed outcomes.
2. **Clinician review:** proposed review fields or a review entity containing accepted/edited classification, reviewer and reviewed time. Do not overwrite immutable raw inference.
3. **Access assignments:** proposed care-role/assignment entities sufficient to enforce clinician and caregiver scope. Keep `user/admin` technical privilege separate from clinical role.
4. **Appointment and notification domains:** only after confirming business rules and source data; otherwise keep those panels explicitly unavailable.
5. **Thermal captures:** separate calibrated artifacts/metadata domain; not an RGB-photo column pretending to hold radiometric data.

Keep migrations additive and backward-compatible. Do not reapply old initial migrations to the existing database. Apply new migrations to isolated staging first. Production migration requires an approved SQL diff, verified backup and rollback plan.

### Save workflow

Capture → real inference → user reviews → confirms patient/wound → image upload → inference/assessment persistence → audit → read back from the patient record.

Use an idempotency token for save/retry. Enclose related DB writes and audit writes in a transaction. Object storage cannot join a PostgreSQL transaction: stage the object, finalize DB linkage, and handle or reconcile orphan objects on failure. A “Saved” toast requires successful persistence, not a browser state update.

## 6. YOLO connection and clinical limits

Wire the replica camera to `trpc.wound.infer` with `{ imageData, confidence }`. Keep the real decoder and class order. Remove mock confidence, random wound size and random severity from connected mode.

### Coordinate contract

The legacy overlay removes letterbox offsets before scaling boxes onto the preview. Preserve and test this behavior:

```text
modelScale = min(640 / originalWidth, 640 / originalHeight)
padX = (640 - originalWidth * modelScale) / 2
padY = (640 - originalHeight * modelScale) / 2
originalX = (modelBox.x - padX) / modelScale
originalY = (modelBox.y - padY) / modelScale
```

Use dimensions after EXIF orientation normalization. Clip boxes to the displayed image and include display letterboxing separately. Prefer returning transform metadata from the server rather than relying on inconsistent browser EXIF handling.

### Required behavior

- Validate payload length, decoded bytes, actual format, dimensions and decompression limits before inference. Align encoded and decoded size limits across the gateway and upload API.
- Use loading, timeout, cancel/retake, retry, no-detection and model-unavailable states. No mock fallback after a real request fails.
- Retake/navigation cannot cause a stale prediction to be attached to a different image or patient.
- Store model provenance and raw output; display confidence as model confidence, not clinical certainty.
- Require clinician review before a suggestion becomes a clinical assessment.
- Do not derive centimeter area/length from detection boxes without validated pixel calibration. Do not claim segmentation from a detection-only model.
- No automatic Wagner stage, treatment recommendation, infection diagnosis or healing rate unless a reviewed clinical rule has the necessary recorded inputs.
- Do not feed thermal/false-color images into this RGB model as equivalent input. No Celsius display from uncalibrated raw counts.
- Verify the exact model is present in the production artifact. The old Dockerfile explicitly copies `server/models` to `dist/models`; the ordinary JS build alone does not do that copy.
- Benchmark warm and cold inference latency, peak memory and concurrency in the intended runtime. Select limits from measurements, not promises.

## 7. Defects that must enter the backlog

Source references below use the pinned backend commit so line numbers stay meaningful.

| Priority | Finding and evidence | Required action |
| --- | --- | --- |
| **Blocking: access control** | [`server/_core/trpc.ts` L13–28](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/server/_core/trpc.ts#L13-L28) checks identity only; patient procedures accept arbitrary IDs without per-patient scope in the inspected DB functions. | Define care-team / caregiver assignments and enforce every list/read/write/export/media operation server-side. Test cross-patient denial. |
| **Blocking: media exposure** | [`storageProxy.ts` L4–42](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/server/_core/storageProxy.ts#L4-L42) signs arbitrary supplied storage keys without authentication or patient authorization. | Resolve a media row, verify session, patient scope and visibility, then issue a short-lived URL. Unauthorized requests must not reach storage signing. |
| **Blocking: production bypass** | [`context.ts` L11–15](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/server/_core/context.ts#L11-L15) permits explicit `LOCAL_AUTH_BYPASS=true` even in production. | Restrict bypass to isolated local/test mode and reject unsafe production startup. |
| **Blocking: database trust** | [`db.ts` L37–47](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/server/db.ts#L37-L47) disables TLS certificate verification. | Install approved CA trust and verify the server certificate in production. |
| **Blocking: synthetic clinical output** | Replica `sk` uses random classes/confidence/size; root app loads simulated patients; camera records use localStorage. | Isolate demo mode from connected mode; no random result, synthetic record or browser-local clinical authority in production. |
| **Important: capture time loss** | [`db.ts` L453–464](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/server/db.ts#L453-L464) receives `capturedAt` but omits it from the media insert. History filters use that column. | Persist the timestamp; test offset normalization, history range inclusion and round-trip retrieval. Do not invent historical capture times during repair. |
| **Important: save/audit integrity** | Assessment/media writes and audit writes use separate calls; inference response is not persisted structurally. | Transactions, idempotency, provenance linkage and storage failure reconciliation. |
| **Important: health false positives** | `system.health` always returns `ok`; DB helpers silently return empty results; current DB tests accept empty data or skip assertions. | Explicit readiness/failure states and integration tests that require an actual isolated DB. |
| **Important: file type mismatch** | Legacy camera upload sends `image/jpeg` even for uploaded PNG/WebP; server accepts claimed MIME. | Decode/validate actual bytes, preserve or transcode intentionally, and test unsupported/malformed images. |
| **Important: list truncation** | Imported and registered lists expose a maximum of 100; UI paginates the fetched subset. | Backend pagination/search with totals and deterministic order; no silent omissions. |
| **Important: delete semantics** | Media deletion removes the DB row but not the stored object. | Define retention/hide/delete policy and authorized cleanup before enabling the replica delete action. |

A strength worth preserving: the old backend already validates many patient fields with Zod, checks assessment-to-patient ownership during photo upload, keeps the model server-side, and includes a real model-load smoke test. Reuse those pieces instead of replacing them with demo logic.

## 8. Implementation phases and exit gates

| Phase | Work | Exit gate |
| --- | --- | --- |
| **0. Baseline and access** | Confirm deployment/runtime owner, approved DB and storage project, current migration state and auth provider. Capture all replica screens/actions. Recover original source if possible. | Written contract inventory; no unknown source dependency; live verification access arranged without sending secrets in chat. |
| **1. Editable replica foundation** | Create React/TS/Vite source, replica tokens/components, TH/EN providers and route/deep-link handling. Keep frozen bundle as reference. Retain existing backend modules/types/tests on `migration/replica-ui-backend` and connect the replacement UI there. | Screens match reference at mobile/desktop; type check/build pass; no old UI components or minified patch dependency. |
| **2. Secure vertical slice** | Establish real session, authorized patient list/detail, protected media delivery, TLS trust and production bypass guard. | Logged-in user sees only permitted real/staging records; unauthenticated and cross-patient tests fail closed. |
| **3. Clinical records and media** | Wire registration/edit/medication/assessment/history/export/archive/restore; correct capture timestamp and MIME behavior; add pagination. | Staging records survive reload and another authorized session; audit and relationships match; retries create no duplicates. |
| **4. Real YOLO path** | Connect RGB capture to real inference, transform overlay, review controls, structured provenance and save workflow. | Capture → ONNX → clinician review → persisted record → report passes; no mock result or remote AI call; production artifact loads model. |
| **5. Dashboard, reports, settings** | Real aggregates, supported trend definitions, persisted report data and truthful status. Add appointments/notifications only with reviewed contracts/data. | Every displayed value has a backend source or explicit unavailable state; all visible actions save/read real data or are disabled honestly. |
| **6. Release validation and cutover** | Run full contract, DB, model, security and browser suites; verify backup/rollback and runtime capacity; review migration/deployment payload. | Explicit user approval for deployment/schema operations, then controlled cutover and post-deploy checks. |

Thermal/native integration runs as a separately validated capability within this roadmap. It must not block the safe RGB/database replacement, but unsupported thermal measurements cannot remain apparently functional at cutover.

### Start with one end-to-end slice

**Real login → authorized patient → RGB image → YOLO result → clinician review → save → reload patient history.** Complete this before connecting every dashboard card. It exposes the highest-risk auth, storage, persistence and model seams early.

## 9. Acceptance tests: what proves everything is connected

| Test area | Required evidence |
| --- | --- |
| Contract completeness | Tests exercise every existing procedure in section 4; existing procedures are reused or explicitly retained as non-UI system capabilities. New contracts are marked and tested. |
| Authentication | Real session, expiry, OAuth nonce/callback, logout cache clearing; anonymous denial; production bypass rejected. Demo role clicks cannot grant privileges. |
| Patient authorization | Clinician/caregiver permissions on list/detail/edit/upload/export/hide/delete/archive/restore; negative cross-patient cases, not just a logged-in happy path. |
| Database | Real isolated PostgreSQL/Supabase staging fixture; register/edit/assessment/medication round trips; foreign keys; audit; UTC capture time; pagination beyond 100. Missing configuration fails visibly. |
| Storage | Actual upload and authorized retrieval; expired URL/hidden image/foreign-patient key denial; size/MIME limits; failure reconciliation and approved retention behavior. |
| YOLO unit/integration | Model hash/load; all supported decoder shapes; threshold and NMS; portrait/landscape/EXIF transforms; no-detection; invalid image; missing-model and queue overload. |
| Clinical review | Raw suggestion stays immutable; human review recorded separately; no fabricated dimensions/stage/risk; saved inference belongs to exact capture/patient. |
| Browser | TH/EN at 390px and 1440px, plus tablet; keyboard/forms; loading/error/offline states; refresh/back/deep links; fake camera fixture plus real-device camera test. |
| Reports | PDF/export built from persisted authorized records with capture date, reviewer, model provenance and disclaimer; no local demo data. |
| Runtime | Node/native Sharp/ONNX dependencies, model in artifact, DB pool limits, cold/warm latency and memory measured, readiness reacts to unavailable dependencies. |
| Privacy | No server keys in client bundle; no clinical images in external AI traffic; no identifiable data in logs, commits or test screenshots. |

Retain `pnpm check`, `pnpm test`, and `pnpm build` for the integrated project. The old inference test proves model loading/response shape, not clinical accuracy. Its camera test checks translations, not the camera/save journey. Add real integration and browser tests rather than counting those existing tests as full acceptance.

Use synthetic or approved de-identified data for automated tests. Do not create/delete production clinical records to prove the integration works. Held-out labeled model evaluation and clinical approval remain separate from UI/backend connectivity testing.

## 10. Cutover and rollback

1. Keep the old deployment available while developing the connected replica on a branch/staging environment.
2. Use isolated staging data. Capture production inventory and backup read-only only after authorized access is available.
3. Review compatibility of all additive schema changes and confirm the old UI can still run against the new schema.
4. Verify target secrets, OAuth callback registration, storage origin behavior, TLS, model artifact and readiness checks.
5. Present exact release commit, migration SQL, target service/domain, access changes and rollback commands for approval. Git push is not deployment approval.
6. After approval, deploy the connected replica and run protected read-only health and workflow checks. Schedule any production write validation separately with explicit authorization.
7. If authentication, authorization, media retrieval or inference fails, restore the previous application artifact. Keep persisted valid records and additive schema; do not delete new clinical data to roll back the UI.
8. Retire the old UI only after acceptance and an agreed rollback window. Keep legacy Git history intact.

### Decisions to settle before the relevant implementation phase

- **UI source:** access to the original replica source, or authorize reconstruction from the deployed reference.
- **Runtime/cutover target:** which existing service will host the full Node app and how the new UI becomes its default. Do not assume the temporary sandbox preview is production.
- **Login:** preserve Manus OAuth by default. A real username/password form requires an explicit auth-provider decision; none exists in the current backend.
- **Clinical roles:** approve officer/nurse/caregiver permission and patient-assignment rules before exposing caregiver access.
- **Missing domains:** agree appointment, alert and review-metric rules; disable unsupported cards until those domains exist.
- **Infrastructure verification:** enable the relevant Supabase connection or use securely configured read-only access when live schema/policy inspection is required. Never request database passwords through chat.

## 11. Evidence and external references

- [Legacy router](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/server/routers.ts).
- [Legacy schema](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/drizzle/schema.ts).
- [Legacy model pipeline](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/server/woundInference.ts).
- [Legacy client overlay](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/client/src/pages/DiagnosticCamera.tsx#L251-L266).
- [Legacy model packaging](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/Dockerfile).
- [Existing thermal proposal, not implemented endpoints](https://github.com/MarzSaksorn/DiabCare-Woundcam/blob/be8b2e92bf0ca568265026d758ae1dee8fdb0bbc/docs/android-companion-web-backend-integration.md).
- [Replica baseline bundle](https://github.com/MarzSaksorn/DiabCare-WoundCam_Replicate-I-NewGen-Present/blob/5377c10f7690ca6c7ac0d6cb3f9772644a825887/assets/index-CjqjVV4H.js).
- [Supabase PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres): persistent IPv4-only backends use session pooling; verify TLS server identity with the appropriate certificate.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): grants and policies are distinct; privileged server connections can bypass RLS, so application access checks remain essential.
- [Supabase changelog](https://supabase.com/changelog.md), checked during planning. The planned server-side PostgreSQL path does not depend on browser Data API exposure; verify relevant platform changes again before implementation.

**Plan completion is not integration completion.** The release gate is end-to-end evidence from the connected app, database, storage and real model, not a copied dashboard rendering successfully.
