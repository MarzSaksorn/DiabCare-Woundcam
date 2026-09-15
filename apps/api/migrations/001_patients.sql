-- 001_patients.sql — patient core record (PRD FR-PAT-1, §8)
-- IDs are ULIDs generated app-side (Crockford base32, 26 chars).

CREATE TABLE patients (
    id              TEXT PRIMARY KEY CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
    mrn             TEXT NOT NULL,
    -- Exactly one of dob / age_years must be present.
    dob             DATE,
    age_years       SMALLINT CHECK (age_years BETWEEN 0 AND 130),
    CONSTRAINT patients_dob_or_age CHECK (dob IS NOT NULL OR age_years IS NOT NULL),
    sex             TEXT NOT NULL CHECK (sex IN ('male', 'female', 'other')),
    dm_type         TEXT NOT NULL CHECK (dm_type IN ('type1', 'type2', 'gdm')),
    dm_onset        DATE,
    identify_by     TEXT NOT NULL CHECK (identify_by IN ('medication', 'icd10', 'lab')),
    -- Single manual field, optional (PRD FR-PAT-1); full labs defer to v0.3.
    hba1c           NUMERIC(4, 1) CHECK (hba1c BETWEEN 2.0 AND 25.0),
    -- Consent process fields (NFR-COMP-1): flag is a process summary;
    -- authoritative history lives in consent_records.
    consent         BOOLEAN NOT NULL DEFAULT FALSE,
    consent_at      TIMESTAMPTZ,
    consent_version TEXT,
    consent_method  TEXT CHECK (consent_method IN ('in_app', 'paper')),
    CONSTRAINT patients_consent_complete
        CHECK (consent = FALSE OR (consent_at IS NOT NULL AND consent_version IS NOT NULL)),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MRN is an external identifier; compare case-insensitively.
CREATE UNIQUE INDEX patients_mrn_uniq ON patients (lower(mrn));

COMMENT ON TABLE patients IS
    'Patient core record. Clinical depth (vitals/labs/comorbidities/meds) defers to the v0.3 patient_clinical extension table keyed by mrn.';
