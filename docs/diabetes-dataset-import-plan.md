# Diabetes Dataset Import Plan

## Status

This plan is **approved and completed**. The additive schema and source-preserved import are live in Supabase. The existing clinical cohort was not changed.

## Source profile

The uploaded `diabetes_dataset_with_notes.csv` contains **100,000 data rows** and **17 columns**. Every inspected field is populated. The exact uploaded-byte SHA-256 is:

`608a44d5619cd7ce7fdf97f6e8d3f754d1d0de72d7ff073122aa5654e1db7da8`

The file contains **14 exact duplicate groups**, representing **14 duplicate extra rows**. It has no stable patient identifier. The source has no obvious direct identifiers, but its clinical notes and demographic combinations remain sensitive health data.

## Current Supabase target

The connected Supabase project is `Database` (`gpxgyvjoamwyrbswljyj`). The live public schema currently contains:

| Table | Rows | Role |
|---|---:|---|
| `diabetes_import_batches` | 1 | Existing 100-record cohort metadata |
| `diabetes_patients` | 100 | Existing patient records |
| `diabetes_patient_observations` | 42,859 | Existing source-preserved observations |

The current patient table cannot represent this CSV losslessly. It requires `identify_by`, `type1`, `type2`, `gdm`, and `dm_onset`, which the source does not provide. Its `sex` enum permits only `FEMALE` and `MALE`, while the source contains `Other` records.

## Recommended target design

Create an **additive, separate example-cohort schema** so this dataset does not silently appear in the existing clinical workspace:

| New table | Purpose | Expected rows |
|---|---|---:|
| `diabetes_example_import_batches` | File hash, filename, source count, duplicate count, mapping version, and status | 1 |
| `diabetes_example_records` | One lossless source row with typed fields and provenance | 100,000 |

Each record should retain `source_row_number`, `row_sha256`, `exact_duplicate_group`, and `is_exact_duplicate`. The existing 100-patient clinical cohort remains unchanged.

## Source-to-target mapping

| Source column | Target field | Handling |
|---|---|---|
| `year` | `year` | Integer source period only, not a complete date |
| `gender` | `gender` | Preserve `Female`, `Male`, and `Other` exactly |
| `age` | `age` | Preserve decimal source value; do not round |
| `location` | `location` | Preserve source text |
| `race:AfricanAmerican` | `race_african_american` | Strict 0/1 indicator |
| `race:Asian` | `race_asian` | Strict 0/1 indicator |
| `race:Caucasian` | `race_caucasian` | Strict 0/1 indicator |
| `race:Hispanic` | `race_hispanic` | Strict 0/1 indicator |
| `race:Other` | `race_other` | Strict 0/1 indicator |
| `hypertension` | `hypertension` | Preserve supplied 0/1 label; do not infer diagnosis |
| `heart_disease` | `heart_disease` | Preserve supplied 0/1 label; do not infer subtype |
| `smoking_history` | `smoking_history` | Preserve categories, including `No Info` |
| `bmi` | `bmi` | Preserve numeric value; no unit assigned |
| `hbA1c_level` | `hba1c_level` | Preserve numeric value; no percent unit assigned |
| `blood_glucose_level` | `blood_glucose_level` | Preserve numeric value; no unit assigned |
| `diabetes` | `diabetes_label` | Preserve supplied 0/1 label; never infer type or onset |
| `clinical_notes` | `clinical_notes` | Preserve verbatim as source text only |

## Duplicate and idempotency policy

Compute the exact file hash before any write. If the hash already exists, the import is a no-op. For a new file, retain all 100,000 rows and flag the 14 exact duplicate extras. Do not merge records by age, gender, location, or other demographics because those fields cannot establish identity.

## Validation rules

The importer must reject the batch before insertion if headers change, rows have malformed field counts, required source values are blank, numerics are invalid, binary fields are not exactly 0/1, or the race indicators violate the documented one-hot contract. It must preserve source categories and notes, avoid assigning missing units, validate de-identification, use bounded inserts, and run batch creation plus record inserts in one transaction.

Logs and error responses must contain aggregate counts only. They must not contain clinical notes or complete source rows.

## API and UI scope

The example cohort should not be mixed into `/patients`. If it needs to be displayed, add an explicit **Example cohort** selector and server-side pagination. The current patient list is not batch-scoped for multiple large cohorts and must not load 100,000 records into the browser.

## Approval and execution result

Approve this exact scope:

1. Create the two additive example-cohort tables in Supabase with RLS and indexes.
2. Import all 100,000 source rows into the separate example cohort.
3. Retain and flag the 14 exact duplicate extras; do not merge or discard them.
4. Preserve `Other` gender, source labels, source notes, and source years without inferred clinical values or units.
5. Keep the existing 100-patient clinical cohort unchanged.
6. Report inserted, flagged, skipped, rejected, and verified counts after import.

The user approved this scope. The migration was applied, the CSV was validated, and all 100,000 rows were loaded in 200 bounded batches. The 14 duplicate groups were retained as 28 source rows; one row in each group is the retained first occurrence and the other 14 rows are flagged as duplicate extras. The batch status is `imported`.

> **Clinical safety boundary:** This is a source-preserved example cohort. It is not a diagnosis, treatment recommendation, or validated longitudinal patient record.

## References

- Source file: `/home/ubuntu/upload/diabetes_dataset_with_notes.csv`
- Current schema: `/home/ubuntu/diabcare-woundcam-v2/drizzle/schema.ts`
- Supabase project: `gpxgyvjoamwyrbswljyj`
- Existing observations: `diabetes_patient_observations`

## Known limitations

The source notes contain risk-oriented language and may be derived from the tabular fields. They must remain source text only and require governance review before any clinical display or decision-support use.

The source has no stable patient ID. It is not safe to claim that rows across years represent the same person.

The source fields also do not specify measurement units for BMI, HbA1c, or glucose, so this plan intentionally does not assign units.

The current app API needs new batch-scoped, paginated procedures before exposing this cohort in the UI.

## Security and residency

The import will remain within the connected Supabase project and existing local-data-residency boundary. RLS will be enabled on the new tables. No external AI or third-party enrichment will process the patient data.

## Decision

**Completed.** The new protected API exposes batch listing and offset-paginated records through `diabetes.exampleBatches` and `diabetes.exampleRecords`. List responses intentionally omit `clinical_notes`; source notes remain stored server-side and are not returned in the collection endpoint.

Verification confirmed 1 import batch, 100,000 example records, 14 duplicate groups, 14 flagged duplicate extras, source rows 2 through 100,001, and unchanged clinical counts of 100 patients and 42,859 observations. The database-backed API regression test covers batch metadata, pagination, source-row ordering, and note omission.
