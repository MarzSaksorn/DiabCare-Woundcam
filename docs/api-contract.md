# WoundCam API Contract — v0.1 draft

| | |
|---|---|
| Version | 0.1-draft (B0) — **frozen EOD D2**; changes after freeze require orchestrator sign-off |
| Date | 2026-09-15 |
| Owner | diab-forge |
| Source | PRD v0.1.1 (§5 FR-AUTH / FR-PAT / FR-WND / FR-UPL / FR-LST; §7 NFRs; §8 schema) |

---

## 1. Conventions

- **Base path:** `/v1`. All bodies JSON unless stated otherwise.
- **Auth:** `Authorization: Bearer <JWT>`. JWT claims: `sub` (user id), `scope` (`patient` | `clinician`), `pid` (patient id, `patient` scope only), `iat`, `exp`, `jti`. Access token 15 min; refresh token 30 d, rotated on use, server-side session store enables logout invalidation (FR-AUTH-3).
- **Scope rules:** `clinician` = full access per FRs. `patient` = own record only; enforcement is server-side on every route (FR-LST-3, FR-UPL-5). Caregiver operates the patient profile — no separate scope in v0.1 (FR-PLT-5).
- **IDs:** ULIDs (Crockford base32, 26 chars).
- **Timestamps:** RFC 3339 UTC. Server clock (`received_at`) is authoritative wherever both exist.
- **Pagination:** cursor-based: `?limit=` (default 20, max 50) + `?cursor=`; responses carry `nextCursor: string | null`.
- **Error envelope (all non-2xx):**
  ```json
  { "error": { "code": "upload/ticket-expired", "message": "human-readable", "details": {} } }
  ```

### Error codes

| HTTP | code | Meaning |
|---|---|---|
| 400 | `validation/failed` | Body/query failed schema validation (`details` lists fields) |
| 401 | `auth/required` | Missing/undecodable token |
| 401 | `auth/invalid-credentials` | Login failed (never reveal which part) |
| 401 | `auth/token-expired` | Access token expired |
| 401 | `auth/revoked` | Session invalidated server-side (logout) |
| 403 | `auth/forbidden` | Valid token, insufficient scope or ownership |
| 403 | `consent/required` | Upload attempted without `consent = true` (FR-PAT-1) |
| 404 | `resource/not-found` | No such resource, or not visible to this scope |
| 409 | `patient/mrn-duplicate` | MRN already exists (FR-PAT-2) |
| 409 | `auth/invite-used` | One-time invite already redeemed (FR-AUTH-2) |
| 409 | `upload/ticket-used` | Ticket/complete already consumed |
| 409 | `photo/duplicate` | Same `sha256` already accepted for this wound |
| 410 | `auth/invite-expired` | Invite past 24 h (FR-AUTH-2) |
| 410 | `upload/ticket-expired` | Presigned PUT past 5 min (FR-UPL-1) |
| 413 | `upload/size-exceeded` | > 10 MB (FR-UPL-2) |
| 415 | `upload/media-type-mismatch` | Magic bytes ≠ signed content-type (FR-UPL-2) |
| 422 | `wound/pending-confirmation` | Upload to a patient-created wound not yet confirmed (FR-WND-4) |
| 429 | `rate/limited` | Edge rate limit hit (NFR-SEC-1) |
| 500 | `server/internal` | Unexpected — never leaks stack traces |

---

## 2. Endpoints

### 2.1 Auth — FR-AUTH

| Method | Path | Scope | Purpose |
|---|---|---|---|
| POST | `/v1/auth/login` | public | Authenticate; returns tokens |
| POST | `/v1/auth/refresh` | public (refresh token) | Rotate refresh, mint access |
| POST | `/v1/auth/logout` | any | Invalidate session server-side (FR-AUTH-3) |
| POST | `/v1/auth/invites` | clinician | Create one-time patient invite, 24 h expiry (FR-AUTH-2) |
| POST | `/v1/auth/invites/redeem` | public | Redeem invite: set password, get tokens (FR-AUTH-2) |

`POST /v1/auth/login` — req `{ "identifier": "email-or-phone", "password": "…" }` → 200 `{ "accessToken", "refreshToken", "expiresIn": 900, "user": { "id", "scope", "patientId"? } }`.

`POST /v1/auth/invites` — req `{ "patientId": "<ulid>" }` → 201 `{ "code", "inviteUrl", "expiresAt" }`. Single-use, 24 h, server-side state.

`POST /v1/auth/invites/redeem` — req `{ "code", "password" }` → 200 token pair for the bound patient. Codes are single-use: reuse → `auth/invite-used`; expired → `auth/invite-expired`.

> Users/credentials storage lands with B3 (auth implementation); the contract surface is frozen here.

### 2.2 Patients — FR-PAT

| Method | Path | Scope | Purpose |
|---|---|---|---|
| POST | `/v1/patients` | clinician | Create patient record (FR-PAT-1/2) |
| GET | `/v1/patients` | clinician | List + search: `?q=` matches name/MRN (FR-PAT-2) |
| GET | `/v1/patients/{patientId}` | clinician · patient(own) | Profile incl. clinical subset |
| PATCH | `/v1/patients/{patientId}` | clinician | Edit fields — audit-logged (FR-PAT-3) |
| POST | `/v1/patients/{patientId}/consent` | patient(own) · clinician | Record consent → `consent_records` row + patient flag (NFR-COMP-1) |
| GET | `/v1/patients/{patientId}/consent-records` | clinician · patient(own) | Consent history |
| POST | `/v1/privacy-requests` | patient(own) · clinician | Data-export or withdrawal request (FR-PAT-5) |
| GET | `/v1/privacy-requests` | patient(own) · clinician | Request list w/ status |

Patient object: `{ "id", "mrn", "dob", "ageYears", "sex", "dmType", "dmOnset", "identifyBy", "hba1c", "consent", "consentAt", "consentVersion", "consentMethod", "createdAt", "updatedAt" }`.

`POST /v1/patients` — req `{ "mrn", "dob"?, "ageYears"?, "sex", "dmType", "dmOnset"?, "identifyBy", "hba1c"? }` (exactly one of `dob`/`ageYears` required) → 201 patient.

`POST /v1/patients/{id}/consent` — req `{ "documentVersion": "1.0", "method": "in_app" | "paper" }` → 201 consent record; sets `consent`/`consentAt`/`consentVersion`/`consentMethod`. Consent change is an audit event (NFR-COMP-2).

`POST /v1/privacy-requests` — req `{ "type": "data_export" | "withdrawal", "patientId"? }` (`patientId` clinician-only) → 201 `{ "id", "type", "status": "open", "requestedAt" }`. Status machine: `open → fulfilled | withdrawn`. Fulfillment automation is v0.3 (FR-PAT-5).

### 2.3 Wounds — FR-WND

| Method | Path | Scope | Purpose |
|---|---|---|---|
| POST | `/v1/wounds` | clinician · patient(own) | Create. Clinician → confirmed; patient/caregiver → `pendingConfirmation: true` (FR-WND-4) |
| GET | `/v1/wounds` | clinician(all) · patient(own) | Wound list w/ latest accepted photo summary (FR-LST-1); `?patientId=` filter |
| GET | `/v1/wounds/{woundId}` | clinician · patient(own) | Detail incl. anchor fields (FR-WND-2/3) |
| PATCH | `/v1/wounds/{woundId}` | clinician | Edit `status` and/or `notes` only — audit-logged (FR-WND-5) |
| POST | `/v1/wounds/{woundId}/confirm` | clinician | Confirm patient-created wound (FR-WND-4) |
| POST | `/v1/wounds/{woundId}/rebaseline` | clinician | Set `effectiveAnchorAt` — audit-logged; history never rewritten (FR-WND-3/5) |

Wound object: `{ "id", "patientId", "location", "laterality", "status", "notes", "pendingConfirmation", "confirmedBy", "firstPhotoAt", "effectiveAnchorAt", "latestPhoto": { "id", "capturedAt", "thumbnailUrl", "unverified" } | null, "createdAt", "updatedAt" }`.

`POST /v1/wounds` — req `{ "patientId", "location", "laterality" }` → 201. Patient-created sets `pendingConfirmation=true`, `status='open'`; uploads are rejected with `wound/pending-confirmation` until confirmed.

### 2.4 Upload pipeline — FR-UPL

| Method | Path | Scope | Purpose |
|---|---|---|---|
| POST | `/v1/wounds/{woundId}/photos/upload-ticket` | clinician · patient(own) | Phase 1: presigned PUT intent (FR-UPL-1) |
| POST | `/v1/photos/{photoId}/complete` | clinician · patient(own) | Phase 2: verify + persist (FR-UPL-2) |
| GET | `/v1/photos/{photoId}` | clinician · patient(own) | Short-lived presigned read URL — **audit-logged** (FR-UPL-3, NFR-COMP-2) |
| GET | `/v1/wounds/{woundId}/photos` | clinician · patient(own) | Chronological accepted-photo timeline (FR-LST-2) |

`POST …/upload-ticket` — req `{ "contentLength": <bytes>, "contentType": "image/jpeg", "capturedAt"?, "captureMethod": "guided" | "force_enabled", "unverified"?: bool }` → 201 `{ "photoId", "uploadUrl", "method": "PUT", "headers": { "Content-Type", "Content-Length" }, "expiresAt" }`.

Rules (all enforced before ticket issue): consent gate (`consent/required`), wound-ownership chain JWT→patient→wound (`auth/forbidden`), wound confirmed (`wound/pending-confirmation`), size ≤ 10 MB (`upload/size-exceeded` at ticket + re-verified at complete). Ticket: single-use, 5-minute expiry, content-length + content-type pinned in the HMAC signature. Key pattern (server-generated, FR-UPL-4): `patients/{patientId}/wounds/{woundId}/{YYYY-MM}/{ULID}.jpg`. EXIF: stripped client-side pre-upload; `/complete` verifies none remains, survivors flagged → background R2 worker strips (PRD v0.1.1 FR-UPL-2).

`POST /v1/photos/{photoId}/complete` → 201 photo object:
`{ "id", "woundId", "sha256", "mime", "sizeBytes", "capturedBy", "captureMethod", "unverified", "capturedAt", "receivedAt", "exifClean" }`. Server sniffs magic bytes (never extension), computes sha256 (dedupe per wound → `photo/duplicate`), writes row, and sets `wounds.first_photo_at` if this is the first validated photo (FR-WND-2).

### 2.5 Lists & compare — FR-LST

Covered by `GET /v1/wounds` (cards) and `GET /v1/wounds/{woundId}/photos` (timeline → side-by-side uses latest + previous accepted photos). Compare is client-rendered from the timeline; no dedicated compare endpoint.

### 2.6 Ops

| Method | Path | Scope | Purpose |
|---|---|---|---|
| GET | `/healthz` | public | Liveness (compose healthcheck / Nginx upstream check) |

---

## 3. Out of scope for v0.1

`/classify` (FR-AI, v0.2), self-reports + alerts (v0.2), PDF reports + EMR import (v0.3). Endpoints will be appended, never mutated, after the D2 freeze.

## 4. Amendment A1 (2026-09-15, audit round 2, orchestrator-approved)

- **GET /v1/stats/overview** — cohort overview stats from `hospital_dm` (live Srinakarin hackathon sample). Response: `{source, patients: {total, type1, type2, gdm, female, male, avgAge, insulinUsers, ckd}, hba1c: {avgOverall, trend: [{period, avg}...]}}`. Owner-directed addition (commits f07ab20 / 97e2d8e). **Dev-only until FR-AUTH (CP1): no JWT middleware yet — cohort aggregates only, zero PHI.**
- CP2 additions: per-period `n` in trend rows (small-sample honesty — period 69's 8.7 avg rests on 2 non-null values); dedup pass for `dm_observations` (1,288 duplicate patient-period hba1c groups, 97.7% exact-identical; 29 differing pairs are a data-owner semantics question).
