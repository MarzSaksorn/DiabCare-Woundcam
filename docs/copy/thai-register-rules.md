# WoundCam — Thai Register Rules (W1b)

| | |
|---|---|
| Version | 1.0 (D1) |
| Owner | diab-writer |
| Status | Canonical spec for ALL Thai copy in WoundCam. TH is authored natively against this file; EN is never machine-translated. |
| Companion | `inventory.md` (slot IDs + EN reference), PRD §6.3 tone rules |

## 1. Register: warm-polite neutral

- One voice for every role (patient, caregiver, clinician) on patient-facing screens: **neutral polite Thai**, warm but efficient.
- **No gendered particles** (`ครับ`/`ค่ะ`/`นะคะ`) anywhere in UI strings. Politeness comes from word choice and sentence shape, not particles. (A human clinician's chat may use them; product copy never does.)
- Prefer short active sentences. Verb-first without a subject when natural: `ถ่ายภาพอีกครั้ง` (Retake), not `คุณสามารถถ่ายภาพใหม่ได้`.
- Use `คุณ` only in the consent document (rule-4 copy) where full sentences need a subject. Everywhere else, omit the pronoun.
- Softeners allowed: `หน่อย`, `เล็กน้อย`, `ไม่เป็นไร`. Baby-talk and ก้ำกึ่ง hedging are not.

## 2. Tone rules → Thai (PRD §6.3 mapping)

- **R1 Steady, not clinical** → short declaratives, everyday words, one instruction per line. `วางไม้บรรทัดข้างแผล แล้วเต็มกรอบ`
- **R2 Never blame** → the photo is the subject, never the person: `ภาพเบลอ — ถือกล้องนิ่ง ๆ แล้วลองอีกครั้ง`, never `คุณถ่ายเบลอ`.
- **R3 Reassure before explain** → safety sentence first: `ภาพของคุณปลอดภัยแล้ว การส่งข้อมูลขัดข้อง — แตะเพื่อลองอีกครั้ง`
- **R4 Plain and unafraid (consent/withdrawal)** → full sentences, zero jargon, states exactly what happens next, choice is never implied as mandatory: `ปฏิเสธได้ตลอดเวลา และจะไม่กระทบการรักษาของคุณ`.

## 3. Terminology dictionary (canonical — single source for i18n keys)

| EN (inventory slot term) | TH | Note |
|---|---|---|
| wound | แผล | never บาดแผลเรื้อรัง |
| photo (wound photo) | ภาพแผล | never รูปถ่าย in clinical context |
| ruler sticker | สติกเกอร์ไม้บรรทัด | the calibration sticker |
| fill the frame / outline | เต็มกรอบ / เส้นขอบเขต | outline = เส้นขอบเขต |
| ghost overlay | ภาพเง่าครั้งก่อน (reference: ภาพครั้งก่อนจาง ๆ) | plain-word rule for teaching chip |
| unverified | ยังไม่ยืนยัน | chip: ยังไม่ยืนยัน |
| upload | อัปโหลด | accepted loanword |
| retake | ถ่ายใหม่ | button: ถ่ายใหม่ |
| accept | ยืนยันภาพนี้ | stronger than ยอมรับ (avoids legal shade) |
| consent | ความยินยอม | consent document = เอกสารความยินยอม |
| withdrawal (of consent) | ยกเลิกความยินยอม | |
| diabetes type 1 / 2 | เบาหวานชนิดที่ 1 / ชนิดที่ 2 | |
| gestational diabetes | เบาหวานขณะตั้งครรภ์ | |
| HbA1c | น้ำตาลสะสม (HbA1c) | lay term first, symbol in brackets |
| blood sugar | น้ำตาลในเลือด | |
| care team | ทีมแพทย์ผู้ดูแล | |
| healing / open / closed | กำลังหาย / เปิดอยู่ / ปิดสนิท | status chips |
| amputated | ขาด (จากการรักษา) | rule-4 screen; never ถูกตัด |
| blurry | เบลอ | |
| sign in / sign out | เข้าสู่ระบบ / ออกจากระบบ | |

## 4. Form and mechanics

- **Numerals:** Arabic numerals (`2.1 ซม.`), Thai digits never.
- **Units:** ซม., กก., %. Symbol spacing per Thai convention (`2.1 ซม.`).
- **Tone marks and spelling:** Royal Society standard spelling; no chat abbreviations (`ค่ะ`→none, `ๆ` always spaced before it: `นิ่ง ๆ`).
- **Punctuation:** use Thai-style spacing, no double spaces; end full sentences with no period in buttons/labels, with period only in consent body text.
- **Length budget (TH runs ~15–20% longer than EN):** buttons ≤ 3 words; live capture warnings ≤ 8 words; consent body paragraphs ≤ 2 lines at Sarabun 20 px. Canvas: allow +1 line height on TH warning outlines.

## 5. Don'ts

- No machine translation of any EN string, ever — TH is authored from the slot's intent.
- No idioms, no ราชาศัพท์, no overly bureaucratic forms (`ดังกล่าว`, `อันว่าโดย`).
- No English loanwords where a common Thai word exists (except dictionary-approved: อัปโหลด, สติกเกอร์, แอป).
- No clinical Latin/Greek on patient screens (ulcer → แผล, exudate → น้ำเหลือง/หนอง only in nurse script, not UI).
- Never `คุณ` + blame verbs together (`คุณลืม...` is forbidden in any state).

## 6. Review gate (pairs with build-plan W3, D9)

- Every TH string checked against: register (no particles), dictionary match, length budget, tone-rule mapping.
- Jargon sweep: any term not in §3 dictionary and not everyday Thai → flag to Writer lead before release.
