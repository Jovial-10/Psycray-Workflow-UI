-- Phase 2.1 · Research jobs + ICP breakdown
-- Run once against the Neon database used by the n8n workflow.
-- Safe to re-run.

-- One row per research request from the frontend.
-- The workflow creates it, replies with its id, then updates `status` at
-- whichever branch the run ends on.
CREATE TABLE IF NOT EXISTS research_jobs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  input         text        NOT NULL,              -- as typed by the user
  input_key     text        NOT NULL,              -- normalized, for duplicate detection
  refresh       boolean     NOT NULL DEFAULT false,
  status        text        NOT NULL DEFAULT 'running'
                CHECK (status IN ('running', 'completed', 'cached',
                                  'unreachable', 'not_found', 'failed')),
  domain        text,                              -- set once resolved
  error         text,
  execution_id  text,                              -- n8n execution, used by the error handler
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_jobs_input_key_idx
  ON research_jobs (input_key, created_at DESC);

CREATE INDEX IF NOT EXISTS research_jobs_execution_id_idx
  ON research_jobs (execution_id);

-- Per-criterion ICP scores so the frontend can show an explainable scorecard.
-- Shape: { "criteria": [ { criterion, score, max, status, reason } ] }
ALTER TABLE company_research
  ADD COLUMN IF NOT EXISTS icp_breakdown jsonb;
