# WoundCam — Hospital Dataset Database

| | |
|---|---|
| Database | PostgreSQL 16.4 (user-space binaries, dev) |
| Connection | `localhost:5433`, db `woundcam`, user `woundcam` (trust auth — DEV ONLY) |
| Provenance | bdi-hackathon-2026-sampled-dataset (Srinakarin Hospital, Khon Kaen University) — LFS-fetched `data_dictionary_diabetes_example.xlsx`: sheet1 = field dictionary, sheet2 = the actual 100-patient sampled cohort |
| Status | Loaded + verified 2026-09-15 |

## Schema (`hospital_dm`)

- **dm_patients** — 100 rows, 33 columns: identity (age, sex), diabetes typing (type1/type2/gdm flags), dm_onset, identify_by, 8 comorbidity flags (atrial_fibrillation, hf, ckd, stroke, dementia, ht, arrhythmias, cad), 17 medication flags (metformin, insulin, semaglutide, dapagliflozin, ...).
- **dm_observations** — 468,200 long-format rows: `(patient_idx, category, field, period, value)`. Categories: lab 260,700 rows (25 fields), vitalsign 115,700 (9 fields), med 68,300 (17), co 23,500 (8). Periods = the dataset's 60-day anchor windows (negative = pre-onset).
- **dm_dictionary** — 91 field definitions (variable, data type, Thai description, unit/values, remark).

Why normalized: the source workbook is a 4,714-column longitudinal wide table — over Postgres's 1,600-column hard limit. The long format is the proper relational shape and matches the app's event-log direction (Forge's schema, Spark's escalation model).

## Verified aggregates (real data, not mock)

- Cohort: 100 patients — Type 1: 6 · Type 2: 75 · GDM: 0 · F 60 / M 40 · avg age 65.7
- Insulin users: 13 · CKD patients: 41
- Avg HbA1c by period (P0→P7): 7.49 → 7.15 → 6.96 → 6.93 → 6.97 → 6.70 → 6.64 → 7.17

## Next

- Forge maps `hospital_dm` → app schema at CP2 (patient clinical context, period model).
- Dashboard demo aggregates switch to live queries against this DB.
- If the full 70k cohort export arrives, it loads into the same shape (dm_observations scales).
