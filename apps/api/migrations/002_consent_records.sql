-- 002_consent_records.sql — consent as a process, not a flag (NFR-COMP-1).
-- Append-oriented history; withdrawal sets withdrawn_at, never deletes rows.

CREATE TABLE consent_records (
    id               BIGSERIAL PRIMARY KEY,
    patient_id       TEXT NOT NULL REFERENCES patients (id) ON DELETE RESTRICT,
    document_version TEXT NOT NULL,
    method           TEXT NOT NULL CHECK (method IN ('in_app', 'paper')),
    consent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    withdrawn_at     TIMESTAMPTZ,
    recorded_by      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX consent_records_patient_idx ON consent_records (patient_id, consent_at DESC);

COMMENT ON TABLE consent_records IS
    'PDPA consent history: subject, document version, method, withdrawal. recorded_by FK to users added with the B3 users migration.';
