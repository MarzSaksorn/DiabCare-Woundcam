# Capture Study Kit — Outline

| | |
|---|---|
| Version | 0.1 outline (Day-1 deliverable; full kit due D5 per build-plan P1) |
| Date | 2026-09-15 |
| Owner | diab-spark (product research) |
| Purpose | Validate PRD M1: ≥60% of home captures usable on first-or-second attempt, clinician-rated. Tests the riskiest product assumption — that patients/caregivers can produce comparable wound photos at home with zero training. |
| Status | Outline for review; recruitment script and rubric to be authored in full by D5 |

---

## 1. Study Design (summary)

- **Design:** 2-week field study, 10–15 diabetic patients with an active wound (or patient + caregiver dyad), capturing daily with the v0.1 app + printed instruction sheet.
- **Primary endpoint:** M1 — share of captures rated *usable* that succeeded on first-or-second attempt (app attempt logs + blind clinician rating).
- **Secondary observations:** capture abandonment rate, caregiver vs. patient success split, which quality-check element fails most (from `unverified` flags and in-app failure states).
- **Blinding:** raters never see attempt counts, patient identity, or capture metadata — photos stripped (EXIF removed server-side), randomized order, coded IDs.

## 2. Recruitment Script (structure; TH first, EN parallel)

Structure of the phone/in-person script (final Thai text authored D3–D4, EN mirror for team review):

1. **Who we are + why** — hospital wound-care team testing a new home photo tool; plain Thai, no clinical jargon.
2. **What participation involves** — one photo per day for 14 days, ~1 minute each; app loaner if needed (28% of home users lack a compatible phone — plan loaners).
3. **Voluntariness + withdrawal** — stop anytime, no effect on their care; say it before asking, not after.
4. **What data we collect** — wound photos + capture metadata only; who sees them (blinded rating clinicians); PDPA consent handled through the app's Consent Gate (consent v1.0) plus a separate study information sheet.
5. **Eligibility confirmation** — active wound, adult, has or is willing to use a smartphone or has a caregiver who will.
6. **Scheduling** — 15-minute onboarding session: enroll in app, hand over instruction sheet, do one supervised capture.
7. **Compensation/thanks** — per clinic policy; thank-you regardless of completion.

Open items: compensation amount, clinic approval path, patient-identification via MRN vs. study codes.

## 3. Printed Instruction Sheet (structure; TH first + EN)

One A4 sheet, front = patient-facing Thai, back = English (for caregiver/clinician reference). Zero-instruction principle applies to the app; the sheet is a backup for the *first* capture only.

1. **Header:** one sentence — what to do, how often ("Once a day, take one photo of your wound").
2. **The 3 steps** (matching the app's end states, not replacing them): lay the ruler sticker next to the wound → open WoundCam, tap the wound → hold steady until the frame turns green → press the big button.
3. **One "good photo" example vs. one "bad photo" example** (annotated: blurry / wound cut off / no ruler).
4. **What happens if it doesn't work:** the app will tell you — just follow the red hints; retaking is normal and fine.
5. **Footer:** helpline contact + study ID sticker space.

Design constraints: ≥14pt type, icon-supported steps, no paragraph longer than 2 lines, Thai copy passes Writer's tone rules (steady, non-blaming, reassure-first).

## 4. Clinician Blind-Rating Rubric (structure)

Rating instrument for the blinded clinician panel (1–2 wound-care clinicians; rubric calibrated in a 10-photo pilot before full rating).

**Per-photo rating (binary gate + sub-checks):**

| Item | Criterion | Scale |
|---|---|---|
| G1. Usable for healing assessment | Could you compare this photo against a prior one to judge healing? | Yes / No (gate) |
| C1. Focus | Wound margin distinguishable at full zoom | pass / fail |
| C2. Framing | Entire wound + ruler sticker in frame | pass / fail |
| C3. Ruler visible & legible | Sticker markings readable for scale | pass / fail |
| C4. Angle | Distortion would not mislead size comparison | pass / fail |
| C5. Lighting | Tissue color/texture distinguishable (no blowout/heavy shadow) | pass / fail |

**Scoring rules:**
- *Usable* = G1 = Yes.
- **M1 numerator** = usable captures on first-or-second attempt (attempt count from app logs, joined post-rating); **denominator** = all study capture attempts.
- Disagreement between two raters → third clinician tie-break; inter-rater agreement reported alongside M1 (target κ ≥ 0.6, else rubric needs revision before results are read).

**Reported alongside M1 (no gate, diagnostic only):** per-criterion fail rates (tells us which CaptureGuide element to fix first), caregiver-vs-patient usability split, day-over-day improvement (learning curve), `unverified` capture rate.

## 5. Kit Contents (D5 deliverable checklist)

- [ ] Final recruitment script (TH + EN)
- [ ] Study information sheet + consent pairing note (PDPA, consent v1.0)
- [ ] Printed instruction sheet final art (TH/EN, printable A4)
- [ ] Rating rubric final + 10-photo calibration pilot results
- [ ] Attempt-log export spec (what Canvas/Forge must expose per capture: wound ID, attempt number, quality-check outcome, unverified flag)
- [ ] Loaner phone inventory + setup guide

## 6. Open Questions

1. Does the attempt-count log exist in v0.1 scope? (M1's first-or-second-attempt definition depends on it — needs Forge confirmation; if absent, M1 degrades to usability share with attempt count self-declared.)
2. Which clinic supplies patients, and who owns clinical ethics sign-off?
3. Loaner phones: purchase or donate from staff?
