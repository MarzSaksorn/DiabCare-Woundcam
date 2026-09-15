# Photo Capture Protocol — DiabCare WoundCam

| | |
|---|---|
| Version | 0.9 (draft for CP1 review) |
| Date | 2026-09-15 |
| Owner | diab-scribe (Track S, deliverable S1) |
| Source | PRD v0.1.1 (FR-CAP, FR-REV, FR-UPL) · Build Plan v0.1 §2 Track S |
| Status | **Source of truth for FR-CAP-9's in-app quality checklist.** Retake criteria (§8) are written method-agnostic (observable outcomes, not implementation metrics) so they survive the D4 capture-spike outcome (WASM CV vs heuristic). Reconcile at S1b (D5). |

This protocol defines how a standardized, comparable wound photo is captured at home — by a patient or caregiver, with zero written instructions. Every rule below is either enforced by the app (capture UI) or taught by it (review screen). The in-app checklist is this document's enforcement layer; where the two disagree, this document wins and the app gets fixed.

---

## 1. Purpose & Scope

- **Purpose:** make home wound photos comparable visit-to-visit — same framing, distance, lighting, and labeling every time — so healing trends are readable and deterioration is caught early (PRD §1 problem statement).
- **Applies to:** every photo submitted through WoundCam v0.1 — patient-captured, caregiver-captured, and clinician-captured alike (caregiver captures are first-class data, PRD §3).
- **Does not cover:** AI classification (v0.2), clinician photo-interpretation procedure, or in-clinic imaging workflows.

## 2. Equipment & Setup

- **Camera:** the patient's own smartphone camera via the WoundCam PWA. No external cameras in v0.1.
- **Calibration sticker:** the supplied ruler sticker (printed scale + WoundCam marker) — it is the fill-frame guide's sizing target (FR-CAP-2) and the in-frame scale reference.
- **Placement:** sticker on skin **next to the wound, not on it** — flat, unwrinkled, fully inside the dashed outline.
- **Mounting/support:** patient holds the phone one-handed or rests it on a stable surface; caregiver may hold it. A self-timer/rest posture is preferred whenever hands are unsteady.
- **Before first capture:** allow camera permission, confirm sufficient room light (the guide warns "too dark"), wipe the lens.

## 3. Patient Preparation

- **Positioning:** expose the wound and ~5 cm of surrounding skin; support the limb naturally (foot flat for plantar views, supported at ankle angle for dorsal).
- **Dressings:** photograph **before** dressing change whenever possible; if a dressing must be removed for the photo, do it per the nurse's instructions and note it in the wound record.
- **Wound state:** do not clean, apply ointment, or debride before the photo — capture the wound as it is.
- **Consent:** capture is blocked until consent is recorded (FR-PAT-1/NFR-COMP-1); the ConsentGate precedes any photo feature.
- **Comfort & dignity:** private setting; only the wound area in frame; stop and reschedule if the patient is in pain or distressed.

## 4. Standard Views & Distances

- **One view per capture; multiple captures when instructed.** The standard set per wound:
  1. **Top-down (primary):** camera axis perpendicular to the wound surface — this is the trend-comparison view.
  2. **Side profile (45°):** reveals depth/undermining; same framing discipline as top-down.
  3. **Context view (optional, clinician-directed):** wider shot including an anatomical landmark for orientation.
- **Distance:** set by the fill-frame guide, not by eye — capture distance is correct when the ruler sticker fills the dashed outline (FR-CAP-2). This replaces "hold 20 cm away"-style instructions, which fail for low-tech-literacy users.
- **Orientation:** same body position and limb posture as the previous accepted photo — the ghost overlay of the last accepted photo is the alignment reference, by alignment not memory (FR-CAP-3).
- **Laterality check:** confirm left/right/NA matches the wound record before shooting (set at Wound Select, FR-WND-4).

## 5. Lighting & Exposure

- **Single fixed source:** use the room's main overhead light; capture at roughly the same time of day as previous sessions (default self-report nudge 19:00 post-dressing supports this).
- **No flash policy (v0.1):** do not use the phone flash — it causes hotspot glare on moist tissue and falsifies color. If the scene is too dark, add a room light; the outline warns "too dark."
- **Avoid:** windows/light sources behind the camera (shadow falls on wound), direct beam on the wound (glare), mixed warm+cool lamps.
- **Exposure rule:** wound bed and surrounding skin both visible — no blown-out (pure white) or crushed (pure black) regions; the live outline flags "too bright"/"too dark" (pages-draft Page 7).

## 6. Hygiene & Safety

- **No contact:** the phone, case, and hands never touch the wound, dressing, or drainage; the ruler sticker is the only approved near-wound item and is cleaned/singled-patient-use.
- **Gloves:** caregivers handling open wounds wear gloves for any dressing interaction around the capture; hand hygiene before and after.
- **Between patients (shared device):** wipe the phone with an alcohol wipe; the sticker is never shared between patients.
- **Stop conditions:** active bleeding, unstable dressing, or strong odor with fever signs → do not capture for the sake of the photo; use the self-report infection path (v0.2) or contact the clinic — the photo loop never delays care.

## 7. Labeling & Metadata

- **Automatic, never typed (FR-CAP-5):** timestamp (device clock; server `received_at` is authoritative), wound ID, capturedBy (name + role), capture method, and the `unverified` flag when the quality check timed out (FR-CAP-7) are attached without patient input.
- **In-frame orientation:** the ruler sticker's marker edge points toward the patient's head (or proximal direction); body-part + laterality come from the wound record, not from the photo content.
- **No PHI in the frame:** faces, tattoos, jewelry, and documents must stay out of frame; the viewfinder outline frames only the wound area + sticker.
- **Identity binding:** the photo row is bound server-side to patient → wound via the ownership check (FR-UPL-5); filenames from the client are never trusted (FR-UPL-4).

## 8. Quality Check & Retake Criteria

**The photo is acceptable when all six criteria below hold. The in-app review checklist mirrors these one-for-one (FR-CAP-9); criteria are stated as observable outcomes so they can be checked by human eye *or* by the spike-chosen method (WASM CV vs heuristic).**

| # | Criterion | Observable pass condition |
|---|---|---|
| Q1 | In frame | Entire wound + margin + full ruler sticker inside the guide outline; no cut-off edges. |
| Q2 | In focus | Wound edges and ruler markings sharp enough to read at review size; no motion smear. |
| Q3 | Sticker visible | Ruler sticker flat, unobscured, readable — usable as a scale reference. |
| Q4 | Exposure correct | No glare hotspot on the wound bed; no all-dark frame; skin tone plausible. |
| Q5 | Angle comparable | Camera axis matches the standard view for this wound (§4) — ghost overlay alignment plausible. |
| Q6 | Metadata bound | Wound ID, laterality, capturedBy attached automatically; no manual entry pending. |

**Retake decision rules:**

- Any single criterion fails → the failing element is highlighted in red on the outline itself (FR-CAP-4); retake immediately — retakes cost nothing, nothing persists until Accept (FR-REV-2).
- Two consecutive failed attempts → accept the ghost overlay's guidance and try the alternate posture from §3 (supported limb, rest position) before a third attempt.
- **10 s force-enable:** if the automated check cannot confirm within 10 s, the shutter force-enables and the capture is flagged `unverified` for clinician review (FR-CAP-7) — the gate never lies and never dead-ends. The patient still sees the six-criteria chips on Review and can retake voluntarily.
- Clinician side: an `unverified` capture is visible in the timeline with its flag (pages-draft Page 10); the clinician may accept it or direct a recapture — direction follows §4–§5 as written here.

**Change control:** §8 criteria may only change via PRD amendment + S1b cross-check (Build Plan §2, S1b), never silently in-app copy.

---

## Open Items

- **OI-S1-1:** reconcile §8 wording with the capture-spike outcome (WASM CV vs heuristic) at S1b (D5) — criteria stay fixed, enforcement method may change.
- **OI-S1-2:** capture study kit (Track P1) will reuse §4/§5 as the printed instruction sheet base (TH/EN).
- **OI-S1-3:** Thai translation of the patient-facing subsets (§3/§5/§8 chips) coordinated with Writer's tone rules (§6.3 PRD).
