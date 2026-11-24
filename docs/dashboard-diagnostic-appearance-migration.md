# Dashboard and Diagnostic Appearance Migration

**Branch:** `feat/dashboard-diagnostic-unslop-migration-2026-11-24`
**Scope:** Approved dashboard appearance, shared clinical workspace shell, and the existing `/camera` and `/assessments` diagnostic page.

The migration keeps the existing React routes, tRPC queries and mutations, patient selection, camera capture, manual inference, assignment, save gates, photo history, authentication, language controls, and clinical/privacy disclaimers. Display labels distinguish live camera preview from manual image review. Dashboard counts and diagnostic patient states continue to reflect connected data; the UI does not invent patients, appointments, trends, photos, or model results.

The diagnostic behavior boundary was checked against the committed baseline with the TypeScript parser: `startCamera`, `captureFrame`, `beginReview`, `saveToPatient`, and every page-level tRPC query/mutation declaration are unchanged. Styles remain limited to the clinical workspace and diagnostic components. The desktop collapsed sidebar retains its 80px width, and the workflow rail now states that assessment linkage is optional while capture time is required.

## Verification

- `pnpm test`: **17 files, 63 tests passed**, including after the independent-review fixes.
- `pnpm check`: passed.
- `pnpm build`: passed. The build emitted non-fatal CSS optimizer warnings for `@property` and a large JavaScript chunk; this run did not compare those warnings against a baseline.
- `git diff --check`: passed.

A read-only independent branch review found the sidebar width override, optional-assessment copy, and stale unchecked plan progress. Those findings were corrected; the full test, TypeScript, build, and diff checks passed again. No other actionable issues were reported.

No browser or screenshot acceptance, authenticated production rendering, physical camera test, or medical validation was performed. No database schema, production data, infrastructure, or review-only mockup branch was changed. The change has not been deployed or merged to `main`.
