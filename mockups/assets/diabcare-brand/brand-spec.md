# DiabCare WoundCam brand assets

This bundle supports the review-only dashboard appearance mockup. It does not modify or replace the app’s source assets.

## Local assets

- `diabcare-logo.jpg` is the repository’s full DiabCare WoundCam wordmark, copied from `client/public/assets/diabcare-logo.jpg`.
- `diabcare-mark.jpg` is the repository’s compact camera-and-medical-mark logo, copied from `client/public/assets/diabcare-mark.jpg`.
- `fonts/prompt/` contains Prompt 400, 500, and 600 for the dashboard’s headings and figures.
- `fonts/09-DtVjJx26TKEr37c9WBI.ttf`, `fonts/13-DtVmJx26TKEr37c9YOZqulw.ttf`, and `fonts/12-DtVmJx26TKEr37c9YMptulw.ttf` provide Sarabun 400, 500, and 600 for English and Thai interface copy.
- `fonts/08-tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf` provides JetBrains Mono 400 for compact language labels.

No external imagery is used. An external image search found no official DiabCare WoundCam dashboard art, so the mockup uses only repository assets.

## Appearance tokens

The approved direction is clinical, steady, and source-conscious. The UI uses a neutral canvas (`#f7f8fa`), white surfaces, dark ink (`#17202b`), secondary text (`#465465`), muted text (`#657487`), and quiet borders (`#dfe5eb`). The sole chrome accent is clinical blue (`#0a4fbe`), with a darker text/action shade (`#003991`). Error red is reserved for the database-unavailable state. No amber or green state is shown because the mockup has no clinical warning or positive-result data.

Spacing follows a 4px rhythm. Controls use an 8px radius, metric groups 12px, and larger surfaces 16px. Prompt and Sarabun preserve the product’s bundled bilingual typography.

## Product UI reference

The current dashboard’s authoritative source references are `client/src/pages/Home.tsx` and `client/src/components/DashboardLayout.tsx`. This bundle does not contain a screenshot of the authenticated production dashboard. The PNG files under `mockups/review/` are screenshots of this proposal only, not screenshots of the current application.
