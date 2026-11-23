# DiabCare WoundCam dashboard appearance mockup

## Review scope

This is a standalone appearance proposal, not an application change. The branch `feat/dashboard-unslop-mockup-2026-11-24` starts from `origin/main` at `f348dbb6ca223ad33016718d27a56ae58955e1b1`. The camera-page redesign remains separate.

The source audit used `client/src/pages/Home.tsx` and `client/src/components/DashboardLayout.tsx`. The dashboard source uses authenticated layout, Wouter routes, bilingual controls, and real summary queries. No authenticated production-dashboard screenshot was captured, so this review is based on source structure and copy, not a pixel-for-pixel comparison. The PNGs here show only this proposal.

## Direction

The approved direction is clinical, steady, and source-conscious. The mockup keeps a quiet neutral canvas, white surfaces, dark readable text, one clinical-blue action accent, bundled Prompt and Sarabun fonts, and authentic repository logos. It retains the dashboard’s overview shell, key metrics, appointment queue, healing trend, today’s schedule, wound-photo history, and clinical-safety note. Desktop uses the existing sidebar pattern; mobile stacks the content and keeps the bottom navigation visible.

## Data and clinical safety

The screen contains no patient names, counts, appointments, photos, calculated trends, or model results. Unknown metrics display dashes with an explanation. Appointment sections explain that no approved source is connected. The trend remains unplotted until the source requirement of two or more dated assessments can be met. Photo history starts in an empty state and includes preview-only loading and unavailable states.

The clinical note preserves the source wording: “Model output supports review only. A qualified clinician must verify it before any care decision.”

## Prototype limits

English/Thai switching and the photo-history state selector work locally in the HTML. Navigation, capture, patient registration, history links, notifications, and profile actions do not connect to application routes, patient records, camera access, APIs, storage, or inference. No care data is read or changed.

## Review artifacts

- `dashboard-page-unslop-mockup.html` — standalone bilingual mockup.
- `assets/diabcare-brand/` — copied logo/font assets and token inventory.
- `review/dashboard-overview-desktop.png` — Chromium render at 1440 × 1650.
- `review/dashboard-overview-mobile.png` — Chromium render at 390 × 2300.

The mockup was also visually inspected at 320px width. Review feedback should focus on dashboard hierarchy, empty/unavailable-state clarity, bilingual fit, and mobile stacking. Any migration into application source requires separate explicit approval.
