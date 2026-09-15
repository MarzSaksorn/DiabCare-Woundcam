# WoundCam v0.1 — Copy Inventory (W1)

| | |
|---|---|
| Version | 0.1 draft (Writer track, D1) |
| Owner | diab-writer |
| Source | pages-draft.md (Page 1–11 states) + PRD v0.1.1 §6.3 tone rules |
| Status | EN draft for review; TH authored natively against `thai-register-rules.md` |

## Tone rules (PRD §6.3)

1. **Steady, not clinical** — guide like a nurse, not a manual.
2. **Never blame the patient** — describe the photo, not their skill.
3. **Reassure before you explain** — safety first, then the fix.

> **TONE-RULE-4 (PROPOSED — needs PRD sign-off):** pages-draft Page 2 cites "tone rule 4" for consent copy. Proposed definition: **"Plain and unafraid — high-stakes/legal copy uses everyday words, states what happens next, and never hides the choice."** Until ratified, rule 4 copy below follows this draft definition and is tagged `r4*`.

Slot ID convention: `<page>.<element>.<state>`. Every slot ships TH + EN; EN below is the reference. Every state is icon + text (never color alone).

---

## Page 1 — Login

| Slot | EN copy | Tone |
|---|---|---|
| login.appname | WoundCam | — |
| login.id.label | Email or phone number | r1 |
| login.pw.label | Password | r1 |
| login.cta | Sign in | r1 |
| login.loading | Signing you in… | r1 |
| login.error | Sign-in didn't work — check your details and try again. | r2 |
| login.success | You're in. | r1 |

## Page 2 — Consent Gate (high-stakes)

| Slot | EN copy | Tone |
|---|---|---|
| consent.title | Before you start: your photos, your choice | r4 |
| consent.body.data | We collect wound photos, dates, and the notes you add. Nothing else from your phone. | r4 |
| consent.body.who | Only your care team can see them. We never share photos for advertising. | r4 |
| consent.body.withdraw | You can say no now, or change your mind later in Settings. Saying no never affects your care. | r4 |
| consent.version | Consent version 1.0 · 2026-09-15 | — |
| consent.cta.accept | I agree | r4 |
| consent.cta.decline | Not now | r4 |
| consent.declined.title | Photos are turned off | r4 |
| consent.declined.body | That's okay. Your care team will keep seeing you as usual. You can turn photos on anytime in Settings. | r4 |
| consent.reconsent.title | Our consent document changed | r4 |
| consent.reconsent.body | Please read it once more, then choose. Your photos stay safe either way. | r4 |

## Page 3 — Clinician Dashboard (clinician-facing; plain but clinical terms allowed)

| Slot | EN copy | Tone |
|---|---|---|
| dash.search.placeholder | Search by name or MRN | — |
| dash.totals.patients | Patients | — |
| dash.totals.wounds | Active wounds | — |
| dash.cta.add | Add patient | — |
| dash.empty | No patients yet — add your first. | — |
| dash.search.empty | No match for "{query}". Check the spelling or MRN. | — |
| dash.error | Couldn't load the list. Tap to retry. | — |
| dash.loading | Loading patients… | — |

## Page 4 — Add Patient

| Slot | EN copy | Tone |
|---|---|---|
| patient.mrn.label | MRN (hospital number) | r1 |
| patient.dob.label | Date of birth (or age) | r1 |
| patient.sex.label | Sex | r1 |
| patient.dmtype.label | Diabetes type | r1 |
| patient.dmtype.opt1 / opt2 / opt3 | Type 1 / Type 2 / Gestational | r1 |
| patient.dmonset.label | Year diagnosed | r1 |
| patient.identify.label | How we identify this record | r1 |
| patient.hba1c.label | Latest HbA1c (optional) | r1 |
| patient.fielderror.required | This field is needed. | r1 |
| patient.fielderror.mrn_dup | This MRN already has a record. Search for it instead. | r1 |
| patient.saving | Saving… | — |
| patient.saved.toast | Patient added ✓ | — |

## Page 5 — Patient Profile

| Slot | EN copy | Tone |
|---|---|---|
| profile.consent.on | Consented · v1.0 | — |
| profile.consent.off | Photos not consented yet | — |
| profile.empty.wounds | No wounds recorded yet. | — |
| profile.cta.addwound | Add wound | — |
| profile.error | Couldn't load this patient. Tap to retry. | — |
| profile.loading | Loading… | — |

## Page 6 — Wound Select / Create

| Slot | EN copy | Tone |
|---|---|---|
| wound.title | Which wound are we photographing? | r1 |
| wound.loc.foot_plantar | Sole of the foot | r1 |
| wound.loc.foot_dorsal | Top of the foot | r1 |
| wound.loc.heel | Heel | r1 |
| wound.loc.toe | Toe | r1 |
| wound.loc.lower_leg | Lower leg | r1 |
| wound.loc.other | Somewhere else | r1 |
| wound.lat.label | Which side? | r1 |
| wound.lat.left / right / na | Left / Right / Either | r1 |
| wound.existing | Open wounds already on record | r1 |
| wound.new | New wound | r1 |
| wound.pending.banner | New — your care team will confirm this wound on their next review. You can photograph it now. | r1 |
| wound.empty.first | Pick where the wound is to begin. | r1 |
| wound.error | Couldn't load wounds. Tap to retry. | — |
| wound.loading | Loading… | — |

## Page 7 — Capture (zero-instruction: UI shows the end state; tone rules 1–2 live here)

| Slot | EN copy | Tone |
|---|---|---|
| cap.warn.frame | Move closer — fill the outline | r1 |
| cap.warn.focus | Hold steady — photo's not sharp yet | r2 |
| cap.warn.sticker | Keep the ruler sticker inside the outline | r1 |
| cap.warn.dark | Too dark — find more light | r1 |
| cap.warn.bright | Too bright — move out of direct light | r1 |
| cap.check.pass | Ready ✓ | r1 |
| cap.force.enabled | Added without the full check — marked "unverified" | r2 |
| cap.unverified.chip | Unverified | — |
| cam.init | Starting camera… | — |
| cam.denied.title | Camera access is off | r2 |
| cam.denied.body | The photo needs your camera. Allow camera access in your phone's settings, then come back. | r2 |
| cam.error | Camera stopped unexpectedly. Tap to try again. | r2 |

## Page 8 — Review

| Slot | EN copy | Tone |
|---|---|---|
| rev.chip.focus | In focus ✓ / Not sharp ✕ | r1 |
| rev.chip.ruler | Ruler visible ✓ / Ruler missing ✕ | r1 |
| rev.chip.exposure | Lighting OK ✓ / Lighting off ✕ | r1 |
| rev.cta.retake | Retake | r1 |
| rev.cta.accept | Accept | r1 |
| rev.teaching | Aligned with last photo ✓ | r1 |
| rev.uploading | Sending your photo… | r1 |
| rev.upload.error | Your photo is safe. The upload hiccuped — tap to retry. | r3 |
| rev.upload.retrying | Trying again… | r3 |
| rev.accepted.toast | Your photo is safe ✅ | r3 |

## Page 9 — Wound List (patient home)

| Slot | EN copy | Tone |
|---|---|---|
| list.title | My wounds | r1 |
| list.card.cta | Photograph | r1 |
| list.add.tile | Add a new wound | r1 |
| list.status.open / healing / closed | Open / Healing / Closed | r1 |
| list.empty | No wounds on record yet — add the first one. | r1 |
| list.error | Couldn't load your wounds. Tap to retry. | r2 |
| list.loading | Loading… | — |

## Page 10 — Wound Detail / Compare

| Slot | EN copy | Tone |
|---|---|---|
| detail.compare.toggle | Compare with previous | r1 |
| detail.hint.single | Only one photo so far — the next one will line up beside it. | r1 |
| detail.timeline | Photo history | r1 |
| detail.unverified.note | This photo skipped the full check. | r1 |
| detail.pending.banner | Waiting for your care team to confirm this wound. | r1 |
| detail.clinician.status | Wound status (care team only) | — |
| detail.status.amputated | Amputated | r4 |
| detail.error | Couldn't load this wound. Tap to retry. | r2 |
| detail.loading | Loading… | — |

## Page 11 — Settings

| Slot | EN copy | Tone |
|---|---|---|
| settings.lang | Language / ภาษา | — |
| settings.account | My account | r1 |
| settings.consent.view | View consent document | r4 |
| settings.consent.withdraw | Stop photo collection | r4 |
| settings.withdraw.confirm.title | Stop photo collection? | r4 |
| settings.withdraw.confirm.body | Your photos already sent stay with your care team. New photo features turn off. You can turn them back on anytime. | r4 |
| settings.logout | Sign out | r1 |
| settings.version | Version {v} | — |

## Shared patterns

- **Toast (save confirmations):** one line, ends with ✓ — "Saved ✓" pattern; never blocks.
- **Error toast (non-retryable):** reassure-first per rule 3, e.g. "That didn't go through. Nothing was lost."
- **Destructive/high-stakes confirm:** title as a question + body states exactly what happens next (see `settings.withdraw.*`).
- **Retake loop (capture→review):** never persists until Accept; retake copy never explains "why you failed" — rule 2.
- **Numbers/units:** Arabic numerals; cm stays "cm" (TH: ซม.) per register rules.
