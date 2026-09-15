# WoundCam v0.1 Build Plan

| | |
|---|---|
| Version | 1.0 |
| Date | 2026-09-15 |
| Owner | diab-orchestrator |
| Source | PRD v0.1.1 (`docs/PRD.md`, commit `70b3c51`) — the requirement contract. This doc defines WHO builds WHAT, in WHAT ORDER, with WHAT checkpoints. |

---

## 1. Execution Model

- **Five parallel tracks** (backend, frontend, copy, docs, release) + product prep, coordinated by diab-orchestrator.
- **Contract lock:** Forge publishes the API contract (endpoints, JWT scopes, request/response shapes, error codes) on D1; **frozen end of D2**. Canvas builds against the frozen contract with mocks; changes after freeze require orchestrator sign-off.
- **Integration checkpoints (CP):** orchestrator reviews delivered work against PRD FRs at CP1–CP4. A checkpoint that fails blocks the next phase — no stacking debt.
- **Daily rhythm:** each track lead posts a side-channel standup (done / next / blockers). Orchestrator clears blockers same-day.

## 2. Track Assignments

### Track B — Backend (diab-forge)
| # | Days | Deliverable |
|---|---|---|
| B0 | D1 | **API contract draft** → frozen EOD D2 (endpoints per FR-UPL/FR-PAT/FR-WND, JWT scopes, error codes) |
| B1 | D1 | Repo scaffold: `apps/api` (Express), `docker-compose.yml` (api + postgres), Nginx conf, Cloudflare DNS/TLS verified live |
| B2 | D1–D2 | Postgres migrations: `patients`, `consent_records`, `wounds`, `photos`, `classifications`, `audit` (schema per PRD §8, incl. `first_photo_at` anchor + `effective_anchor_at`) |
| B3 | D1–D2 | Auth: JWT issue/refresh, `patient`/`clinician` scopes, server-side logout (FR-AUTH) |
| B4 | D2–D3 | Patients API: CRUD + search + consent-gate middleware + consent_records writes (FR-PAT, NFR-COMP-1) |
| B5 | D3–D4 | Wounds API: create (clinician), patient-created pending-confirmation path, list (FR-WND) |
| B6 | D4–D6 | Upload pipeline: `upload-ticket` / `complete` / read endpoints, R2 integration, EXIF strip, magic-byte sniff, 10 MB cap, sha256 dedupe, presigned read URLs (FR-UPL) |
| B7 | D7–D8 | Audit event taxonomy wired (field edits, photo upload/read/delete, consent change) + `unverified` capture flag support (FR-CAP-7) |
| B8 | D9 | Contract test suite + API reference doc |
| B9 | D8–D9 | Wound status/notes edit, per-wound photo timeline, data-export/withdrawal request endpoints (FR-WND-5, FR-LST-2, FR-PAT-5) — audit round 1 addition |

### Track F — Frontend (diab-canvas)
| # | Days | Deliverable |
|---|---|---|
| F1 | D1–D2 | PWA scaffold: Vite + React (server-state hooks, **no Redux**), routing, Sarabun, Thai/EN i18n skeleton, API client against frozen contract (mocks until B6 lands) |
| F2 | D3 | Login + patient list/search + add patient (with consent flow, FR-PAT) |
| F3 | D4 | Wound select/create screen: location + laterality large tiles, pending-confirmation state (FR-WND-4) |
| F4 | D4 | **Quality-check feasibility spike** (focus + sticker visibility method) → decision: WASM CV vs heuristic, with the 10 s force-enable fallback (FR-CAP-7) |
| F5 | D4–D6 | Capture screen: camera-first, fill-frame guide, ghost overlay (adjustable opacity), live outline warnings incl. exposure, auto metadata (FR-CAP) |
| F6 | D6–D7 | Review screen: state chips (not quizzes), Retake/Accept ≥44 px, teaching chip with plain-word copy (FR-REV) |
| F7 | D7–D8 | Wound list + side-by-side compare (FR-LST) |
| F8 | D9–D10 | A11y pass (WCAG 1.4.1: icon + text on every state), error/toast states, E2E smoke |

### Track W — Copy (diab-writer)
| # | Days | Deliverable |
|---|---|---|
| W1 | D1–D2 | Copy inventory: every patient-facing state across all v0.1 screens, tone rules applied (consent, capture guidance, retake, upload errors, caregiver attribution) |
| W1b | D3 | Thai register ruleset doc (short, authored) — the spec W2 writes against; audit round 1 addition |
| W2 | D3–D5 | Thai authored natively (register rules; no clinical jargon on patient screens) — delivered as i18n resource files |
| W3 | D9 | Thai language review gate + jargon sweep (gates release) |

### Track S — Docs (diab-scribe)
| # | Days | Deliverable |
|---|---|---|
| S1 | D1–D3 | Photo Capture Protocol — full 8-section draft v0.9; retake criteria stay method-agnostic until the FR-CAP-7 spike outcome lands |
| S1b | D5 | Protocol reconcile with the capture-check method decision (spike lands D4) — audit round 1 addition |
| S2 | D4–D5 | Consent document, Thai + EN, versioned as `consent_version 1.0` (pairs with FR-PAT-1/NFR-COMP-1) |
| S3 | D9–D10 | Protocol ↔ in-app checklist cross-check; docs polish |

### Track L — Release (diab-log)
| # | Days | Deliverable |
|---|---|---|
| L1 | D1 | Changelog automation from Conventional Commits + SemVer tagging workflow |
| L2 | D10 | `v0.1.0` tag + generated changelog |

### Track P — Product prep (diab-spark)
| # | Days | Deliverable |
|---|---|---|
| P1 | D3–D5 | Capture study kit: recruitment script, printed instruction sheet (TH/EN), clinician blind-rating rubric for M1 |
| P2 | D10 | Study-ready checklist against the shipped v0.1 |

## 3. Timeline

| Phase | Days | Dates | Checkpoint |
|---|---|---|---|
| 0 — Dispatch | D0 | Tue 15 (today) | Briefs out; contract ownership assigned |
| 1 — Scaffolds | D1–D2 | Wed 16 – Thu 17 | **CP1:** auth works, PWA shell runs, contract frozen |
| 2 — Core build | D3–D6 | Fri 18 – Mon 21 | **CP2:** patient + wound flow E2E against real API |
| 3 — Capture pipeline | D7–D9 | Tue 22 – Thu 24 | **CP3:** capture E2E — photo in R2, row in Postgres, audit written |
| 4 — Harden + tag | D10 | Fri 25 | **CP4:** Thai gate passed, a11y pass, `v0.1.0` tagged, demo to Saksorn |
| 5 — Capture study | W3 | Mon 28 → | M1 gate: ≥60% usable captures (PRD §9) |

## 4. Definition of Done — v0.1.0

1. All v0.1 FRs (PRD §5) implemented and demoable end-to-end: enrollment → consent → wound create → capture → review/accept → wound list/compare.
2. M2 measured: capture → accepted-in-record < 30 s on mid-range Android over 4G.
3. Zero secrets in the client bundle (verified by inspection + build scan).
4. Consent gate blocks uploads without `consent = true`; consent_records row written.
5. Audit rows exist for every clinical mutation, including photo reads.
6. Thai review gate (W3) and a11y pass (F8) signed off.
7. `v0.1.0` tagged; changelog generated by L1 automation.

## 5. Risk Watchlist

| Risk | Owner | Mitigation |
|---|---|---|
| Quality-check spike fails (D4) | Canvas + Forge | Fallback is already spec'd: force-enable + `unverified` flag; M1 study then measures honestly |
| Contract drift after D2 freeze | Forge | Change requests go through orchestrator; versioned contract doc in repo |
| R2/Cloudflare account or DNS unknowns | Forge | Verified live in B1 (D1) — if blocked, local MinIO is dev-only, never prod |
| i18n resource format mismatch with F1 | Writer + Canvas | W1 delivers in the i18n skeleton's format; agreed D2 |
| Scope creep mid-build | Orchestrator | §2 non-goals in PRD are contractual; new ideas → backlog, not the sprint |

## 6. Orchestrator Standing Duties

- Daily standup poll per track (side-channel), blocker clearing same-day.
- CP1–CP4 PRD-compliance reviews (FR-by-FR against delivered work).
- Contract change arbitration.
- Post-v0.1.0: dispatch v0.2 briefs (AI proxy, escalation, self-report) — scoped in PRD §4/§5, gated on the capture study's M1 result.

## 7. Open Item Carried Forward

- **OI-1 (Saksorn): rotate the exposed Roboflow/diabcare keys.** Not blocking v0.1 (no AI calls until v0.2), but must close before FR-AI build starts.
