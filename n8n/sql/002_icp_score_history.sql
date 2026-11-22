-- Phase 2.1 · Deterministic ICP scoring: score history
-- Run once against the Neon database used by the n8n workflows. Safe to re-run.
--
-- Every score (fresh research, refresh, recalculation) is appended here with
-- the evidence it was calculated from and the versions used, so any score can
-- be explained and reproduced later, even after the ICP configuration changes.
-- company_research keeps the current score; icp_breakdown there holds the full
-- result (criteria, weights, versions, snapshot, previous score, change).

CREATE TABLE IF NOT EXISTS icp_score_history (
  id                    bigserial   PRIMARY KEY,
  domain                text        NOT NULL,
  trigger               text        NOT NULL
                        CHECK (trigger IN ('research', 'refresh', 'recalculate')),
  score                 integer,
  tier                  text,
  algorithm_version     text        NOT NULL,
  config_version        text,
  snapshot_id           text,        -- research run the evidence came from (exec-<n8n execution id>)
  evidence_fingerprint  text,        -- hash of the normalized evidence; equal = same evidence
  result                jsonb       NOT NULL,  -- full engine output
  evidence              jsonb,                 -- normalized evidence that was scored
  job_id                uuid,                  -- research_jobs.id (null for recalculation)
  calculated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS icp_score_history_domain_idx
  ON icp_score_history (domain, calculated_at DESC);
