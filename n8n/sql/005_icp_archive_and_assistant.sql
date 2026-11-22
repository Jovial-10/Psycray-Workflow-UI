-- Phase 2.2 · Archiving ICP versions + the ICP assistant's usage log
-- Run once against the Neon database used by the n8n workflows. Safe to re-run.
-- Additive only.

-- Archiving hides a version from the Versions list without deleting it:
-- scores that were calculated with it keep their link to its settings.
-- Versions themselves stay immutable; archiving is a separate record, and
-- un-archiving deletes that record. Version 1 (the original) and the active
-- version can't be archived (checked by the API; version 1 also here).
CREATE TABLE IF NOT EXISTS icp_version_archive (
  version_id   integer     PRIMARY KEY REFERENCES icp_config_versions (id),
  archived_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION icp_version_archive_guard() RETURNS trigger AS $$
BEGIN
  IF (SELECT version FROM icp_config_versions WHERE id = NEW.version_id) = 1 THEN
    RAISE EXCEPTION 'The original ICP version (version 1) cannot be archived';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS icp_version_archive_no_v1 ON icp_version_archive;
CREATE TRIGGER icp_version_archive_no_v1
  BEFORE INSERT OR UPDATE ON icp_version_archive
  FOR EACH ROW EXECUTE FUNCTION icp_version_archive_guard();

-- One row per ICP assistant request that reached the model: rate limiting
-- and a simple usage/cost record. Only the instruction's length is kept.
CREATE TABLE IF NOT EXISTS icp_assistant_log (
  id                 bigserial   PRIMARY KEY,
  created_at         timestamptz NOT NULL DEFAULT now(),
  instruction_chars  integer     NOT NULL
);

CREATE INDEX IF NOT EXISTS icp_assistant_log_created_idx ON icp_assistant_log (created_at DESC);
