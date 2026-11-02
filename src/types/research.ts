/**
 * Domain types for the Psycray Research Agent (n8n workflow).
 *
 * Field names intentionally stay in snake_case so they match the
 * `company_research` Postgres table and n8n node outputs 1:1 — no mapping
 * layer is needed when the real backend is connected.
 */

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

/** Value submitted to the "Ingest Company Input" form trigger. */
export interface ResearchRequest {
  /** A company name ("Acme Corp") or a domain/URL ("acme.com"). */
  input: string
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
}

/* ------------------------------------------------------------------ */
/* ICP scoring — "ICP Scoring Logic"                                   */
/* ------------------------------------------------------------------ */

/**
 * Tier thresholds: High ≥ 80, Moderate ≥ 55, otherwise Low.
 * "Needs Review" is emitted when the synthesis was not valid JSON.
 */
export type IcpTier = "High Fit" | "Moderate Fit" | "Low Fit" | "Needs Review"

export interface IcpScore {
  /** 0–100, or null when scoring could not run. */
  score: number | null
  tier: IcpTier
  /**
   * Human-readable reasons, e.g. "Core vertical: SaaS/Technology (+35)".
   * Produced by the workflow but not yet persisted to Postgres.
   */
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
  account_brief: string | null
}

/* ------------------------------------------------------------------ */
/* Workflow responses                                                  */
/* ------------------------------------------------------------------ */

/** "Return Cached Research" — a validated record < 30 days old existed. */
export interface CachedResearchResponse {
  status: "cached"
  domain: string
  cached_at: string
  company_facts: CompanyResearchRecord["company_facts"]
  research_signals: ResearchSignals | null
  synthesized_research: SynthesizedResearch | null
  sources: { urls: string[] } | null
  icp_score: number | null
  icp_tier: IcpTier | null
  account_brief: string | null
}

/** "Return Unreachable Response" — the company website failed to load. */
export interface UnreachableResearchResponse {
  status: "error"
  message: string
  domain: string
}

/** Fresh research completed and was upserted to `company_research`. */
export interface CompletedResearchResponse {
  status: "completed"
  record: CompanyResearchRecord
}

export type ResearchRunResult =
  | CachedResearchResponse
  | UnreachableResearchResponse
  | CompletedResearchResponse
