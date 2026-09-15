-- 003_wounds.sql — wound record + anchoring (PRD FR-WND-1..5, §8).

CREATE TABLE wounds (
    id                   TEXT PRIMARY KEY CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
    patient_id           TEXT NOT NULL REFERENCES patients (id) ON DELETE RESTRICT,
    location             TEXT NOT NULL CHECK (location IN
        ('foot_plantar', 'foot_dorsal', 'heel', 'toe', 'lower_leg', 'other')),
    laterality           TEXT NOT NULL DEFAULT 'na' CHECK (laterality IN ('left', 'right', 'na')),
    -- Healing state, orthogonal to confirmation (FR-WND-4).
    status               TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'healing', 'closed', 'amputated')),
    notes                TEXT,
    -- Patient-created path (FR-WND-4): unconfirmed wounds reject uploads.
    pending_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by         TEXT,
    confirmed_at         TIMESTAMPTZ,
    -- Timeline anchor (FR-WND-2/3): set once by the first validated photo
    -- (passed /complete); re-baselining writes effective_anchor_at only —
    -- first_photo_at and all history are never rewritten.
    first_photo_at       TIMESTAMPTZ,
    effective_anchor_at  TIMESTAMPTZ,
    created_by           TEXT NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT wounds_pending_unconfirmed
        CHECK (pending_confirmation = FALSE OR (confirmed_by IS NULL AND confirmed_at IS NULL))
);

CREATE INDEX wounds_patient_idx ON wounds (patient_id, created_at DESC);

COMMENT ON TABLE wounds IS
    'Wound record. 60-day period bucketing is query-time only: period = floor(days_since(coalesce(effective_anchor_at, first_photo_at)) / 60). confirmed_by FK to users added with the B3 users migration.';
