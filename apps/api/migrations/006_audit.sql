-- 006_audit.sql — append-only audit trail (PRD NFR-COMP-2, FR-PAT-3).

CREATE TABLE audit (
    id            BIGSERIAL PRIMARY KEY,
    at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_user_id TEXT,
    actor_role    TEXT CHECK (actor_role IN ('patient', 'clinician', 'system', 'caregiver')),
    -- Event taxonomy (NFR-COMP-2): '<entity>.<action>' — e.g.
    -- patient.create, patient.update, wound.update, wound.rebaseline,
    -- photo.upload, photo.read, photo.delete, consent.change,
    -- privacy.request, wound.confirm.
    action        TEXT NOT NULL,
    entity_type   TEXT NOT NULL,
    entity_id     TEXT NOT NULL,
    field         TEXT,
    old_value     JSONB,
    new_value     JSONB,
    request_id    TEXT
);

CREATE INDEX audit_entity_idx ON audit (entity_type, entity_id, at DESC);
CREATE INDEX audit_actor_idx ON audit (actor_user_id, at DESC);

-- Append-only guard (NFR-COMP-2): no updates, no deletes, ever.
CREATE OR REPLACE FUNCTION audit_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit is append-only';
END;
$$;

CREATE TRIGGER audit_no_update
    BEFORE UPDATE OR DELETE ON audit
    FOR EACH ROW EXECUTE FUNCTION audit_block_mutation();

COMMENT ON TABLE audit IS
    'Append-only clinical audit trail; retention + tamper-evidence per NFR-COMP-2/3 (final values pending compliance sign-off). actor_user_id FK to users added with the B3 users migration.';
