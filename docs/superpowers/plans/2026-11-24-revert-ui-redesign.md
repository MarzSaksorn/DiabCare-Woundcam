# Dashboard and Diagnostic UI Revert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the dashboard and diagnostic UI to the appearance on `main` before the 2026-11-24 migration, then publish a replacement GHCR image.

**Architecture:** Start from the current `origin/main` at `c24af00`. Use history-preserving Git revert operations, newest first, for the migration/documentation commits `c24af00`, `5d1001f`, `2251fed`, `6a86cff`, and `8ce5c28`; this restores the pre-migration tree at `f348dbb` without rewriting history. Keep the existing Dockerfile, Compose configuration, and image workflow unchanged. Push the revert to `main` to trigger the existing GHCR publish workflow; do not deploy or start a service.

**Tech Stack:** Git, React 19, TypeScript, pnpm, Vitest, GitHub Actions, Docker Buildx, GHCR.

**Spec:** User request: “revert ui redesign and publish image.” Approved project context and migration record: `docs/dashboard-diagnostic-appearance-migration.md`.

## Global Constraints

- Preserve Git history; do not reset or force-push `main`.
- Revert only the 2026-11-24 dashboard, shared-shell, and diagnostic appearance migration and its completion records.
- Keep the existing Dockerfile, `.dockerignore`, Compose configuration, and `.github/workflows/dockerfile-build.yml` unchanged.
- Run the repository's tests, TypeScript check, production build, and whitespace check before pushing.
- Push to `origin/main` so the authorized existing workflow publishes GHCR tags; do not deploy, start Compose, or change production data.
- Use Git identity `MarzSaksorn <mark94849@proton.me>` for any new commit.

## Review Focus

- The revert must restore the app files to their `f348dbb` contents while leaving the existing GHCR workflow and Docker files unchanged.
- The selected commit set must remove only the migration commits and their completion documentation, not the older `main` change that loads the database CA from a mounted file.
- The post-revert application checks must pass before a push; CI failure must be inspected and reported rather than bypassed.
- Image publication success must be confirmed from the Actions run logs, including the new `latest` and commit-specific tags; publication does not imply deployment.

---

### Task 1: Revert the appearance migration

**Files:** Restore the changed paths from the migration commits: `client/src/components/DashboardLayout.tsx`, `client/src/components/DashboardLayout.test.tsx`, `client/src/styles/clinical-appearance.css`, `client/src/pages/Home.tsx`, `client/src/pages/Home.test.tsx`, `client/src/styles/home-redesign.css`, `client/src/components/CameraPreviewFrame.test.tsx`, `client/src/pages/DiagnosticCamera.tsx`, `client/src/pages/DiagnosticCamera.test.tsx`, and `client/src/styles/diagnostic-appearance.css`. Remove migration-only `TODO.md`, `docs/dashboard-diagnostic-appearance-migration.md`, and `docs/superpowers/plans/2026-11-24-dashboard-diagnostic-appearance.md` by reverting their introducing changes. Do not change Docker or workflow files.

**Interfaces:** Restore these app paths to the versions at `f348dbb`. Keep route contracts, backend code, and Docker/Compose/GHCR configuration unchanged.

- [ ] Fetch `origin` and confirm `origin/main` still points to `c24af00` before creating a revert branch.
- [ ] Revert `c24af00`, `5d1001f`, `2251fed`, `6a86cff`, and `8ce5c28` in newest-first order, preserving history and resolving only expected revert conflicts.
- [ ] Confirm the app paths match `f348dbb` and that the Dockerfile, `.dockerignore`, Compose file, and workflow are unchanged.

### Task 2: Validate, push, and verify image publication

**Files:** No additional application files; record the revert in Git history.

**Interfaces:** The existing `main` push workflow publishes `ghcr.io/marzsaksorn/diabcare-woundcam` for `linux/amd64` with `latest` and `sha-<short-commit>` tags.

- [ ] Run `pnpm test`, `pnpm check`, `pnpm build`, and `git diff --check`; resolve failures before pushing.
- [ ] Commit the revert with a clear `revert:` message using the specified Git identity.
- [ ] Push the revert commit to `origin/main` without force.
- [ ] Verify remote `main`, a clean worktree, and successful completion of the Actions image-publish job; report the exact tags and digest.
- [ ] Do not deploy the image or start the Compose service.
