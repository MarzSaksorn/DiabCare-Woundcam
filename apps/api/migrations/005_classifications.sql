-- 005_classifications.sql — AI classification results (PRD FR-AI-2/3, §8).
-- Table created now per B2; rows are written by the v0.2 inference proxy.

CREATE TABLE classifications (
    id         TEXT PRIMARY KEY CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
    photo_id   TEXT NOT NULL REFERENCES photos (id) ON DELETE RESTRICT,
    model_id   TEXT NOT NULL,
    provider   TEXT NOT NULL,
    result     JSONB NOT NULL,
    latency_ms INTEGER CHECK (latency_ms >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cache key = photo sha256 + model_id (FR-AI-3): re-classification is a
-- DB hit, not an API call.
CREATE INDEX classifications_cache_idx ON classifications (photo_id, model_id);

ALTER TABLE photos
    ADD CONSTRAINT photos_classification_fk
    FOREIGN KEY (classification_id) REFERENCES classifications (id);
