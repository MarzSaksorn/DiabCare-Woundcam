# Dashboard and Diagnostic Appearance Migration

Implementation branch: `feat/dashboard-diagnostic-unslop-migration-2026-11-24`
Approved plan: `docs/superpowers/plans/2026-11-24-dashboard-diagnostic-appearance.md`

## Shared clinical workspace shell

**Status: Complete — commit `8ce5c28`; route-scoped shell and navigation regressions passed.**

- [x] Apply the revised shared workspace appearance only to `/`, `/camera`, and `/assessments`; keep patient, report, settings, login, and registration screens outside this style scope.
- [x] Preserve the existing `DashboardLayout`, authentication gate, sidebar links, active-route behavior, language control, logout, sidebar collapse, and bottom navigation.
- [x] Keep patient-selection confirmation reachable above mobile navigation and preserve existing responsive padding for the bottom confirmation dock.
- [x] Keep keyboard focus visible and preserve accessible navigation landmarks and control names.

## Dashboard appearance migration

**Status: Complete — commit `6a86cff`; regression, TypeScript, and build checks passed.**

- [x] Use the approved neutral canvas, white surfaces, readable dark text, clinical-blue accent, bundled Prompt/Sarabun fonts, and authentic DiabCare logos.
- [x] Retain the dashboard’s existing content order: header/actions, key metrics, appointments queue, healing trend, today’s schedule, wound-photo history, and clinical-safety note.
- [x] Retain a Reports route action while keeping no more than two prominent header actions.
- [x] Continue to use the existing dashboard summary and imported-cohort queries; show real zero counts as zero and unavailable values as dashes with an explanation.
- [x] Preserve loading, error, empty, and populated wound-photo history behavior and patient-record destinations.
- [x] Keep appointment and healing-trend data honest: do not show fabricated appointments or trends; explain disconnected sources and preserve the two-dated-assessment trend requirement.
- [x] Preserve the English and Thai interface and the source clinical-safety language that model output supports review only and requires clinician verification.
- [x] Fit dashboard content at 320px phone width without losing section order or readable controls; responsive rules were inspected, not screenshot-tested.

## Diagnostic capture and review appearance migration

**Status: Implementation and independent review complete; review findings resolved.**

- [x] Apply the approved clinical appearance to the existing `DiagnosticCamera` page rendered at `/camera` and `/assessments` without changing route names or history anchors.
- [x] Preserve patient search, context filters, selection, assignment, and selected-patient record loading/error behavior.
- [x] Preserve camera permissions, live preview, camera errors, upload, capture, reset/retake, inference trigger, model overlays, segmentation controls, assessment assignment, save gates, upload mutation, and photo history.
- [x] Preserve manual inference behavior; do not imply continuous model analysis before an explicit review action.
- [x] Preserve English/Thai copy, image-privacy guidance, model-review boundaries, and clinical disclaimers. Do not fabricate patient rows or inference outputs.
- [x] Keep diagnostic capture and review controls at least 48px high, maintain mobile stacking, and keep patient confirmation controls reachable.
- [x] Keep clinical assessment, inference, and save behavior unchanged; this task changes appearance and truthful display wording only. A TypeScript AST comparison confirmed `startCamera`, `captureFrame`, `beginReview`, `saveToPatient`, and every page-level tRPC query/mutation declaration match the committed baseline exactly.
- [x] Fix the reviewed sidebar collapse override and clarify that assessment linkage is optional in both languages.

## Verification and delivery boundary

**Status: Checks and independent review complete; final commit and feature-branch push remain.**

- [x] `pnpm test`: 17 test files and 63 tests passed after review fixes.
- [x] `pnpm check`: passed after review fixes.
- [x] `pnpm build`: passed after review fixes. It emitted non-fatal `@property` CSS optimizer and large-chunk warnings; no baseline comparison was performed.
- [x] `git diff --check`: passed after review fixes.
- [x] Complete an independent read-only branch review and resolve confirmed issues. The reviewer found a 240px sidebar override defeating collapse, misleading copy about assessment being required, and unchecked plan progress; these were corrected and rechecked.
- [x] Confirm the final changes contain no schema migrations, production-data writes, infrastructure edits, or unrelated review-mockup modifications.
- [ ] Commit the remaining reviewed diagnostic changes and documentation, then push only `feat/dashboard-diagnostic-unslop-migration-2026-11-24`. Do not deploy, merge into `main`, or change production configuration.

Verification limits: no browser/screenshot acceptance, authenticated production rendering, physical camera test, or medical validation was performed.
