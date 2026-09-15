-- 004_photos.sql — photo metadata; binaries live in R2 only (FR-UPL, §8).

CREATE TABLE photos (
    id               TEXT PRIMARY KEY CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
    wound_id         TEXT NOT NULL REFERENCES wounds (id) ON DELETE RESTRICT,
    -- Server-generated key: patients/{patientId}/wounds/{woundId}/{YYYY-MM}/{ULID}.jpg
    r2_key           TEXT NOT NULL UNIQUE,
    sha256           TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    mime             TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
    size_bytes       BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
    captured_by      TEXT NOT NULL,
    capture_method   TEXT NOT NULL DEFAULT 'guided'
        CHECK (capture_method IN ('guided', 'force_enabled')),
    -- Caregiver attribution (FR-PLT-5): submissions weighted equally.
    by_caregiver     BOOLEAN NOT NULL DEFAULT FALSE,
    -- Honest-gate fallback (FR-CAP-7): capture force-enabled after 10 s.
    unverified       BOOLEAN NOT NULL DEFAULT FALSE,
    -- Device clock, informational; received_at is authoritative (§8).
    captured_at      TIMESTAMPTZ,
    received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- EXIF verified absent at /complete (stripped client-side per PRD
    -- v0.1.1 FR-UPL-2; background R2 worker strips survivors).
    exif_clean       BOOLEAN NOT NULL DEFAULT FALSE,
    -- Denormalized pointer to the latest classification (v0.2 wiring);
    -- FK added in 005 once classifications exists.
    classification_id TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Dedupe: same file accepted twice into one wound is an error (contract
    -- photo/duplicate); cross-wound reuse of a file is allowed (re-capture).
    CONSTRAINT photos_wound_sha_uniq UNIQUE (wound_id, sha256)
);

CREATE INDEX photos_wound_idx ON photos (wound_id, received_at DESC);

COMMENT ON TABLE photos IS
    'Photo metadata row; object storage is R2 bucket woundcam-photos. captured_by FK to users added with the B3 users migration.';
