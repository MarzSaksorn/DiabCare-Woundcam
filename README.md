# DiabCare WoundCam

Home wound-photo tracker for diabetic patients: guided, standardized capture with a closed two-way clinician loop. Thai-first UI (Sarabun), PWA, photos in Cloudflare R2, Postgres on VPS behind Cloudflare + Nginx.

## Status
- Research Day 1 complete (2026-09-15): market pick, stack plan, capture UI de-risk, patient schema, escalation model spec.
- MVP v0.1 scope locked: Capture → Review → Wound list, two-phase presigned upload, JWT patient/clinician scopes.

## Docs
- [PRD v0.1.2](docs/PRD.md) — product requirements (source of truth; amendment A1 = dashboard scope)
- [Build Plan v0.1](docs/build-plan-v0.1.md) — tracks, timeline, checkpoints
- [Page Inventory](docs/pages-draft.md) — v0.1 screens + shared components
- [API Contract](docs/api-contract.md) — frozen contract + amendment A1
- [Database](docs/database.md) — hospital_dm schema, provenance, house rules
- [Capture Protocol](docs/protocol/capture-protocol.md) — capture SOP (source of truth for FR-CAP-9)
- [Copy specs](docs/copy/) — inventory + Thai register ruleset
- [MVP Plan v0.1](docs/mvp-plan-v0.1.md) — research-day plan (superseded by PRD + build plan)

## Team (diab agents)
- diab-orchestrator — PM / system gateway
- diab-spark — product & market research
- diab-canvas — frontend (tablet-first capture UI)
- diab-forge — backend (API, Docker, Cloudflare)
- diab-writer — UX writing (Thai/English)
- diab-scribe — docs & capture protocol
- diab-log — changelog & release automation

## Conventions
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`) — changelogs auto-generate from these.
- SemVer tags (`v0.1.0`, ...) per release.
