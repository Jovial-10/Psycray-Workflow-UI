-- Phase 2.2 · Configurable ICP: profiles, immutable versions, admin keys
-- Run once against the Neon database used by the n8n workflows. Safe to re-run.
-- Additive only: no existing table or row is changed, except that
-- icp_score_history gains a nullable column.

-- An ICP profile ("psycray-default"). active_version_id = the published version
-- applied to fresh research, cached research and recalculation.
CREATE TABLE IF NOT EXISTS icp_profiles (
  id                 serial      PRIMARY KEY,
  slug               text        NOT NULL UNIQUE,
  name               text        NOT NULL,
  active_version_id  integer,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Every published configuration. Never updated or deleted (see trigger), so
-- any score can be reproduced from the version it names.
CREATE TABLE IF NOT EXISTS icp_config_versions (
  id              serial      PRIMARY KEY,
  profile_id      integer     NOT NULL REFERENCES icp_profiles (id),
  version         integer     NOT NULL,
  label           text        NOT NULL UNIQUE,   -- stamped on scores as config_version
  config          jsonb       NOT NULL,          -- full IcpConfig (src/lib/scoring/icpEngine.ts)
  note            text,
  change_summary  jsonb,                         -- [{ kind, text }] vs the previous version
  published_by    text        NOT NULL,
  published_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, version)
);

DO $$ BEGIN
  ALTER TABLE icp_profiles
    ADD CONSTRAINT icp_profiles_active_version_fk
    FOREIGN KEY (active_version_id) REFERENCES icp_config_versions (id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION icp_config_versions_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Published ICP versions are immutable; publish a new version instead';
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS icp_config_versions_no_change ON icp_config_versions;
CREATE TRIGGER icp_config_versions_no_change
  BEFORE UPDATE OR DELETE ON icp_config_versions
  FOR EACH ROW EXECUTE FUNCTION icp_config_versions_immutable();

-- Named admin keys. Only the SHA-256 of a key is stored.
CREATE TABLE IF NOT EXISTS icp_admins (
  id          serial      PRIMARY KEY,
  name        text        NOT NULL,
  key_hash    text        NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz
);

ALTER TABLE icp_score_history
  ADD COLUMN IF NOT EXISTS config_version_id integer REFERENCES icp_config_versions (id);

-- Seed: the default profile, and version 1 = the configuration existing
-- evidence-based scores were calculated with (same label).
INSERT INTO icp_profiles (slug, name)
VALUES ('psycray-default', 'Psycray default ICP')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO icp_config_versions (profile_id, version, label, config, note, published_by)
SELECT p.id, 1, 'psycray-default-2026-11-21', $config$
{
  "version": "psycray-default-2026-11-21",
  "baseline": 0,
  "weights": {
    "industry_fit": 20,
    "company_size": 15,
    "digital_opportunity": 30,
    "growth_signals": 25,
    "project_ownership": 10
  },
  "industryFit": {
    "saas": 1,
    "software": 1,
    "manufacturing": 1,
    "industrial_supplier": 1,
    "association": 1,
    "agency": 1,
    "logistics": 0.5,
    "professional_services": 0.5,
    "healthcare": 0.25,
    "financial_services": 0.25,
    "education": 0.25,
    "nonprofit": 0.25
  },
  "sizeBands": [
    {
      "min": 1,
      "max": 9,
      "fraction": 0.25
    },
    {
      "min": 10,
      "max": 50,
      "fraction": 1
    },
    {
      "min": 51,
      "max": 250,
      "fraction": 0.7
    },
    {
      "min": 251,
      "max": 1000,
      "fraction": 0.25
    }
  ],
  "digitalOpportunity": {
    "types": [
      "workflow_automation",
      "system_integration",
      "customer_portal",
      "custom_software",
      "legacy_modernization",
      "data_reporting"
    ],
    "stated": 1,
    "inferred": 0.5
  },
  "growthSignalStrength": {
    "hiring": 0.6,
    "funding": 0.6,
    "expansion": 0.6,
    "acquisition": 0.5,
    "partnership": 0.3,
    "product_launch": 0.3
  },
  "growthWindowMonths": 18,
  "undatedSignalFactor": 0.5,
  "projectOwnership": {
    "types": [
      "technical_leader",
      "product_leader",
      "operations_leader",
      "in_house_engineering"
    ],
    "stated": 1,
    "inferred": 0.5
  },
  "geography": {
    "countries": [
      "United States"
    ]
  },
  "requirements": {
    "location": {
      "enabled": false
    },
    "b2b": {
      "enabled": false
    },
    "min_employees": {
      "enabled": false,
      "value": 10
    },
    "min_revenue": {
      "enabled": false,
      "usd": 1000000
    }
  },
  "tiers": {
    "high": 80,
    "moderate": 55
  },
  "minCoverageForTier": 50
}
$config$::jsonb,
       'Initial configuration: weights 20/15/30/25/10, baseline 0, no hard requirements', 'system'
FROM icp_profiles p
WHERE p.slug = 'psycray-default'
ON CONFLICT (label) DO NOTHING;

UPDATE icp_profiles p
SET active_version_id = v.id
FROM icp_config_versions v
WHERE p.slug = 'psycray-default'
  AND v.label = 'psycray-default-2026-11-21'
  AND p.active_version_id IS NULL;
