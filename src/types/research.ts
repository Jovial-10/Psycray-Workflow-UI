/**
 * Domain types for the Psycray Research Agent (n8n workflow).
 *
 * Field names intentionally stay in snake_case so they match the
 * `company_research` Postgres table and n8n node outputs 1:1 — no mapping
 * layer is needed when the real backend is connected.
 */

import type { EvidenceRef, IcpConfig, IcpEvidence, Qualification, RequirementResult, ScoreChange } from "@/lib/scoring/icpEngine"

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

/** Value submitted to the "Ingest Company Input" form trigger. */
export interface ResearchRequest {
  /** A company name ("Acme Corp") or a domain/URL ("acme.com"). */
  input: string
  /** Skip the 30-day cache and research again. */
  refresh?: boolean
}

/** Output of the "Normalize Input" code node. */
export type NormalizedInput =
  | {
      input_type: "domain"
      raw_input: string
      candidate_domain: string
      candidate_url: string
    }
  | {
      input_type: "name"
      raw_input: string
      company_name: string
    }

/* ------------------------------------------------------------------ */
/* Company facts — "Extract Core Company Facts" (gpt-4o-mini)          */
/* ------------------------------------------------------------------ */

export type CustomerType = "B2B" | "B2C" | "Enterprise"

export interface CompanyFacts {
  company_name: string | null
  /**
   * The company's own primary industry (e.g. "Semiconductors").
   * Added 2026-11-13; null for research saved before then.
   */
  industry: string | null
  value_proposition: string | null
  products_and_services: string[]
  target_industries: string[]
  customer_types: CustomerType[]
  headquarters_locations: string[]
  detected_technologies: string[]
}

/** Stored when the LLM response could not be parsed as JSON. */
export interface UnparsedCompanyFacts {
  raw: string
}

/* ------------------------------------------------------------------ */
/* Research signals — "Find Growth Signals" (Exa)                      */
/* ------------------------------------------------------------------ */

/** A single Exa search result as returned by the workflow. */
export interface ExaSignal {
  title: string
  url: string
  publishedDate?: string | null
  summary?: string | null
}

/** Shape persisted in `company_research.research_signals`. */
export interface ResearchSignals {
  results: Pick<ExaSignal, "title" | "url">[]
}

/* ------------------------------------------------------------------ */
/* Synthesis — "Synthesize Intelligence & Evidence" (gpt-4o)           */
/* ------------------------------------------------------------------ */

export interface ConfirmedFact {
  fact: string
  source: string
}

export interface ReasonableInference {
  inference: string
  basis: string
}

export interface RecentSignal {
  signal: string
  source_url: string
  /** ISO date, or null when the source did not publish one. */
  date: string | null
}

export interface SynthesizedResearch {
  company_name: string
  domain: string
  summary: string
  confirmed_facts: ConfirmedFact[]
  reasonable_inferences: ReasonableInference[]
  unknowns: string[]
  recent_signals: RecentSignal[]
  /** Normalised scoring evidence (engine v2+). Lets the ICP Studio preview and rescoring run without new research. */
  icp_evidence?: IcpEvidence | null
}

/* ------------------------------------------------------------------ */
/* ICP scoring — "ICP Scoring Logic"                                   */
/* ------------------------------------------------------------------ */

/**
 * Tier thresholds: High ≥ 80, Moderate ≥ 55, otherwise Low.
 * "Needs Review": under half the weighted criteria had evidence (scoring v2),
 * or the synthesis was not valid JSON (legacy keyword scoring).
 */
export type IcpTier = "High Fit" | "Moderate Fit" | "Low Fit" | "Needs Review"

/**
 * One row of the ICP scorecard. Produced by the scoring engine
 * (src/lib/scoring/icpEngine.ts) in n8n.
 * - `unknown`: no evidence, so not judged. Earns 0 points but is not a failure.
 * - `partial`: some of the weight earned (e.g. an inferred need).
 * - `conflicting`: sources disagree; scored on the lower-fit reading.
 */
export interface IcpCriterionScore {
  criterion: string
  score: number
  max: number
  status: "met" | "partial" | "not_met" | "unknown" | "conflicting"
  reason: string
  /** Quotes and sources the criterion was judged on (scoring v2 only). */
  evidence: EvidenceRef[]
}

/** How a score was produced, and how it compares with the one before it. */
export interface IcpScoring {
  /** "2.0.0" and later: evidence-based engine. "1-keyword": the original keyword rules. */
  algorithm_version: string
  config_version: string | null
  /** Percent of the score per criterion key. */
  weights: Record<string, number> | null
  /** Share of the weight that had evidence (0–100). */
  coverage: number | null
  /** Score if every unknown criterion turned out fully met. */
  max_possible: number | null
  missing: string[]
  /** Research run the evidence came from. */
  snapshot_id: string | null
  evidence_fingerprint: string | null
  calculated_at: string | null
  /** Database id of the published ICP version (engine v3+). */
  config_version_id: number | null
  baseline: number
  max_possible_tier: IcpTier | null
  /** Hard requirements, evaluated separately from the score (engine v3+). */
  requirements: RequirementResult[]
  qualification: Qualification | null
  previous: { score: number | null; tier: string | null; calculated_at: string | null; algorithm_version: string } | null
  change: ScoreChange | null
}

export interface IcpScore {
  /** 0–100, or null when scoring could not run. */
  score: number | null
  tier: IcpTier
  rationale: string[]
}

/* ------------------------------------------------------------------ */
/* Account brief — "Generate Account Brief" (gpt-4o)                   */
/* ------------------------------------------------------------------ */

/** Section headers the brief prompt asks the model to produce, in order. */
export const ACCOUNT_BRIEF_SECTIONS = [
  "Company Summary",
  "Key Findings & Digital Maturity",
  "Relevant Recent Signals",
  "ICP Fit & Pursuit Verdict",
  "Potential Psycray Service Opportunities",
  "Likely Roles or Departments to Contact",
  "Suggested Outreach Talking Points",
  "Sources & Evidence",
] as const

export type AccountBriefSection = (typeof ACCOUNT_BRIEF_SECTIONS)[number]

/** A brief as presented in the UI, derived from a research record. */
export interface AccountBrief {
  domain: string
  company_name: string
  icp_tier: IcpTier
  /** Raw markdown-ish text returned by the model. */
  content: string
  generated_at: string
}

/* ------------------------------------------------------------------ */
/* Persistence — `company_research` table (Neon Postgres)              */
/* ------------------------------------------------------------------ */

export type ResearchStatus = "validated" | "error/unreachable"

export interface CompanyResearchRecord {
  id: number
  /** Unique key; the workflow upserts on this column. */
  domain: string
  status: ResearchStatus
  /** ISO timestamp. Records younger than 30 days are served from cache. */
  updated_at: string
  company_facts: CompanyFacts | UnparsedCompanyFacts | null
  research_signals: ResearchSignals | null
  synthesized_research: SynthesizedResearch | null
  sources: { urls: string[] } | null
  icp_score: number | null
  icp_tier: IcpTier | null
  /** Scorecard rows. Null for rows researched before Phase 2. */
  icp_breakdown: IcpCriterionScore[] | null
  /** Scoring metadata (versions, coverage, change). Null for legacy keyword scores. */
  icp_scoring: IcpScoring | null
  account_brief: string | null
}

/* ------------------------------------------------------------------ */
/* Research jobs — `research_jobs` table                               */
/* ------------------------------------------------------------------ */

/**
 * - running      the workflow is still working
 * - completed    fresh research was saved
 * - cached       research < 30 days old was reused
 * - unreachable  the company website failed to load or returned an error
 * - not_found    no official website could be identified from the name
 * - failed       a workflow step errored, or the job ran over 10 minutes
 */
export type ResearchJobStatus =
  | "running"
  | "completed"
  | "cached"
  | "unreachable"
  | "not_found"
  | "failed"

/** Reply to `POST /api/research`. */
export interface StartResearchResponse {
  job_id: string
  /** True when an identical request was already running; its job is reused. */
  duplicate: boolean
}

/** Saved research records plus where they came from. */
export interface CompanyList {
  records: CompanyResearchRecord[]
  /**
   * "sample" = fictional mock records (shown with a notice).
   * "live" = the company_research table, once a history endpoint exists.
   */
  source: "live" | "sample"
}

/** One row of the `research_jobs` log, as used by the activity feed. */
export type ResearchJobSummary = Pick<ResearchJob, "job_id" | "status" | "input" | "domain" | "error" | "created_at">

export interface ResearchJobList {
  jobs: ResearchJobSummary[]
  source: "live" | "sample"
}

/* ------------------------------------------------------------------ */
/* ICP configuration — `icp_profiles`, `icp_config_versions`           */
/* ------------------------------------------------------------------ */

export interface IcpConfigVersion {
  id: number
  version: number
  /** Stamped on scores as `config_version`. */
  label: string
  config: IcpConfig
  note: string | null
  change_summary: { kind: string; text: string }[]
  published_by: string
  published_at: string
}

/** Reply to `GET /api/icp/config`. */
export interface IcpConfigState {
  profile: { slug: string; name: string; active_version_id: number }
  /** Newest first. */
  versions: IcpConfigVersion[]
}

/** Reply to `POST /api/icp/rescore`. */
export interface RescoreAllSummary {
  config_version: string
  rescored: number
  unchanged: number
  up_to_date: number
  needs_refresh: string[]
  changes: { domain: string; previous: number | null; updated: number }[]
}

export interface ScoreHistoryEntry {
  id: number
  trigger: "research" | "refresh" | "recalculate"
  score: number | null
  tier: string | null
  algorithm_version: string
  config_version: string | null
  config_version_id: number | null
  snapshot_id: string | null
  calculated_at: string
  change: ScoreChange | null
}

/** Reply to `POST /api/research/rescore`. */
export interface RescoreResponse {
  record: CompanyResearchRecord
}

/** Reply to `GET /api/research/status?id=…`. */
export interface ResearchJob {
  job_id: string
  status: ResearchJobStatus
  input: string
  domain: string | null
  error: string | null
  created_at: string
  updated_at: string
  /** Present once status is `completed` or `cached`. */
  record: CompanyResearchRecord | null
}
