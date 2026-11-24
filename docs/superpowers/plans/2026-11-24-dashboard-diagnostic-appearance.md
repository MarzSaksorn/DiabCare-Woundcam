# Dashboard and Diagnostic Appearance Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the approved dashboard appearance into the application and apply the same clinical visual system to its diagnostic capture/review page without changing clinical behavior.

**Architecture:** Keep React, Wouter, the existing `DashboardLayout`, tRPC queries/mutations, and diagnostic components. Scope the revised shell to `/`, `/camera`, and `/assessments`, then migrate dashboard markup/styles and add a bounded diagnostic appearance layer. Keep both pushed mockup branches unchanged; implement on `feat/dashboard-diagnostic-unslop-migration-2026-11-24`.

**Tech Stack:** React 19, TypeScript 5.9, Wouter, Tailwind CSS 4, existing CSS, existing HeroUI 3.2.6, Vitest 2.

**Spec:** `mockups/dashboard-page-unslop-mockup.html`, `mockups/dashboard-page-unslop-review.md`, and `mockups/assets/diabcare-brand/brand-spec.md`. Diagnostic visual reference: `mockups/camera-page-unslop-mockup.html` and `mockups/camera-page-unslop-review.md` on `feat/unslop-main-ui-2026-11-21` at `25d7b04`. The user's current request authorizes application migration, not deployment.

## Global Constraints

- Preserve `/`, `/camera`, `/assessments`, existing navigation labels, and `#capture-history`.
- Preserve authentication, language preference, logout, patient search/filtering/selection, permission handling, camera preview, upload, capture, inference, detector/segmentation controls, assignment, save, and history.
- Preserve English/Thai copy and clinical/privacy disclaimers. Apply approved display-copy changes in both languages; do not imply continuous inference when inference starts manually after capture.
- Preserve dashboard summary and imported-cohort query behavior. No fabricated patient names, counts, appointments, trends, photos, or model outputs.
- Keep every dashboard section in its existing order. Keep the Reports route accessible even though the mockup has only two header actions.
- Use `#f7f8fa` canvas, white surfaces, `#17202b` ink, `#465465` secondary text, `#657487` muted text, `#dfe5eb` borders, and `#0a4fbe` accent with `#003991` action ink. Retain the dark diagnostic viewfinder; preserve semantic overlay colors and warnings.
- Keep bundled Prompt/Sarabun and authentic DiabCare logo assets. Use a 4px spacing rhythm, 8px controls, and 12–16px surfaces. Diagnostic workflow touch controls remain at least 48px high.
- No schema migrations, production data writes, infrastructure changes, dependency upgrades, production deployment, or push to `main`.
- Mockup review controls and mockup-only notices must not enter application UI.

## Review Focus

- A successful summary containing zero counts must show zero, not an unavailable dash; failures must not resemble an empty success.
- Both English and Thai must retain safety copy and fit narrow dashboard/diagnostic layouts.
- Only the three requested routes receive revised shell styles; patient, report, settings, login, and registration pages keep their behavior and appearance.
- Patient selection confirmation and capture controls must remain reachable above mobile navigation; the desktop sidebar collapse must still work.
- Camera live, captured, processing, and processed modes must stay distinct; model overlays and save gates must remain tied to actual results.

## Current Audit and Boundaries

`Home.tsx` already preserves honest count, appointment, trend, and photo-history data states. Its stylesheet adds a decorative header wash, metric accent stripes, multiple icon colors, and compressed mobile layouts. The approved mockup removes that decorative chrome and groups four metrics into one neutral surface.

`DiagnosticCamera.tsx` already provides a two-column capture/review console and HeroUI controls. Its effective CSS still contains tracked uppercase labels, several overlapping token systems, a viewfinder color wash, and decorative badges. Some labels say “AI LIVE ASSIST” although `beginReview()` initiates inference only after capture. Correct display labels without changing the inference trigger.

`DashboardLayout` supplies shared authentication, sidebar collapse, language switching, logout, and a patient-selection dock. Its orientation-only switching and decorative camera nav treatment differ from the approved mockup. Apply changes behind a route-derived class so unrelated pages do not change.

The repository has no active Manus Webdev project binding. The read-only configuration checks returned `not_attached` and “No active project for post-edit processing.” Use the existing repository's TypeScript/build/test commands as the checking fallback. Do not create a second hosted application, replace its backend, or bypass authentication for preview. Dependencies were installed from the existing lockfile.

The 4,734-line camera stylesheet has accumulated override layers. A dedicated, documented appearance layer is a bounded migration choice; wholesale cleanup is outside scope and remains technical debt.

## Task 1: Route-scoped clinical shell

**Files:** Modify `client/src/components/DashboardLayout.tsx`; create `client/src/styles/clinical-appearance.css`; create `client/src/components/DashboardLayout.test.tsx`.

**Interfaces:** Keep `DashboardLayoutProps` unchanged. Derive `isClinicalWorkspace` from exact Wouter locations `/`, `/camera`, and `/assessments`; emit `.app-shell.is-clinical-workspace`. The stylesheet owns shared tokens and shell rules only inside that class. Existing children and `bottomDock` remain unchanged.

- [x] Install locked dependencies using the existing package-manager setup, then run `pnpm check` and the affected existing tests to record the baseline. Do not run tests that write to connected production services.
- [x] Write rendering tests for the route-scoped class, unchanged navigation destinations, authentication gating, language control, collapse affordance, and bottomDock presence. Mock only external hooks/providers that cannot run safely against real services.
- [x] Run `pnpm test -- client/src/components/DashboardLayout.test.tsx` and confirm failures against the missing appearance scope.
- [x] Add the route-derived class and scoped stylesheet. Keep desktop header, quiet sidebar, full-width mobile bottom navigation, visible focus, and padding for confirmation controls. Do not replace account handling or navigation data.
- [x] Run the new test plus `pnpm test -- server/navigation.test.ts server/language.coverage.test.ts server/auth.logout.test.ts`; inspect the scoped rules for no selectors leaking into unrelated routes.
- [x] Commit only the completed shell changes on the implementation branch after checks pass (`8ce5c28`).

## Task 2: Dashboard appearance migration

**Files:** Modify `client/src/pages/Home.tsx` and `client/src/styles/home-redesign.css`; create `client/src/pages/Home.test.tsx`.

**Interfaces:** Retain `Home()` and its existing `dashboard.summary` and `diabetes.summary` query interfaces. Retain `recentPhotos` and patient-record links. Keep the `home-stitch-*` section names where practical so the migration remains easy to review.

- [x] Write render tests for section order, bilingual safety note, real zero-count success, unavailable summary, photo-history loading/error/empty/populated states, and separate imported-cohort note. Keep fixtures confined to tests.
- [x] Run `pnpm test -- client/src/pages/Home.test.tsx`; confirm the new appearance/copy expectations fail before migration.
- [x] Replace the decorated welcome panel with the approved Clinical overview header, two primary/secondary actions, and a retained Reports affordance outside the main action pair. Group metrics into a neutral four-column surface, use two columns on phones, and retain queue, trend, schedule, photo history, and safety sections.
- [x] Replace dashboard-specific CSS with the approved token/spacing/radius treatment and restrained feedback. Keep headings and disabled time controls readable at 320px. Expose loading as a localized status rather than a silent animated skeleton.
- [x] Run the new tests plus `pnpm test -- server/dashboard.metrics.test.ts server/language.coverage.test.ts`; inspect query and link diffs to ensure data behavior is unchanged.
- [x] Commit the completed dashboard changes after checks pass (`6a86cff`).

## Task 3: Diagnostic appearance alignment and final verification

**Files:** Modify `client/src/pages/DiagnosticCamera.tsx`; create `client/src/styles/diagnostic-appearance.css`; extend `client/src/components/CameraPreviewFrame.test.tsx`; create `client/src/pages/DiagnosticCamera.test.tsx`. Add a concise migration record under `docs/`.

**Interfaces:** Keep all existing `PatientSelector`, `CaptureWorkspace`, `CameraPreviewFrame`, `WoundInferenceResults`, and `DiagnosticPhotoHistory` callback/prop contracts. Import the appearance layer after existing component styles. Do not change `startCamera`, `captureFrame`, `beginReview`, `saveToPatient`, query arguments, or payload formats for appearance work.

- [x] Write regression expectations for bilingual patient-selection empty/error states, searchable/filterable selection controls, preserved history anchor, and truthful live/captured/manual-review labels. Extend existing frame tests to cover standby, camera failure, live video, processing, processed overlays, and retained reset controls.
- [x] Run affected tests and confirm new display expectations fail before applying the visual changes.
- [x] Apply neutral patient gate/list surfaces, clinical-blue selection/actions, wrap-safe patient details, quiet typography, restrained viewfinder framing, and a clearly separated review/assignment rail. Keep actual model-review warnings and overlay meaning. Change only display wording that incorrectly implies continuous inference.
- [x] Keep controls at least 48px high and preserve the existing mobile confirmation behavior. Match shared clinical tokens without migrating dashboard metric or appointment panels into the diagnostic workflow.
- [x] Run `pnpm check`, `pnpm test`, and `pnpm build`. Report pre-existing failures separately from introduced failures. Do not use tests that write to connected production services.
- [x] Request a read-only independent branch review of clinical contracts, route/style scope, bilingual states, and the completed checks. Resolve confirmed issues and rerun the affected checks.
- [x] Inspect the final diff for no backend/schema/infrastructure/mockup edits; record verification limits honestly. Do not claim real hardware, authenticated production rendering, or medical validation unless actually exercised.
- [x] Commit and push only `feat/dashboard-diagnostic-unslop-migration-2026-11-24`. Do not deploy or merge into `main` (`5d1001f` and the final documentation update were pushed to origin).

## Approval and Execution

The design direction is approved. The implementation used Native execution on the existing `/camera` and `/assessments` screen. Both review branches remain unchanged; delivery stops before deployment or merge to `main`.
