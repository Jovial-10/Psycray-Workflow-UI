/**
 * Psycray ICP scoring engine: the single source of truth for ICP scores.
 *
 * The same file runs in every place a score is calculated or previewed:
 *   - n8n Code nodes (fresh research, cached research, recalculation, bulk
 *     rescoring, config validation), type-stripped and embedded by
 *     `npm run sync:n8n` (scripts/n8n-scoring.ts)
 *   - the ICP Studio's live preview and the mock data (frontend)
 *   - the regression tests (tests/scoring)
 *
 * Rules:
 *   - The LLM only CLASSIFIES evidence into fixed categories, each with a
 *     quote and a source. It never produces numbers that reach the score.
 *   - `scoreCompany` is a pure function of (evidence, config). Same input,
 *     same output, every time. No clock, no randomness, no I/O.
 *   - Score = baseline + (100 − baseline) × weightedFit, never above 100.
 *   - Unknown is not failure: a criterion without evidence earns nothing
 *     towards the supported score but counts towards the possible maximum.
 *     An unverifiable hard requirement is "unknown", never "fail".
 *   - Hard requirements are separate from the score: a company can score
 *     high and still be disqualified.
 *
 * Constraints (so it can be pasted into an n8n Code node):
 *   - no imports, no globals beyond plain JS built-ins (no URL, no crypto)
 *   - only erasable TypeScript syntax
 */

export const ICP_ALGORITHM_VERSION = "3.0.0"
/** Version label for scores produced by the original keyword rules. */
export const LEGACY_ALGORITHM_VERSION = "1-keyword"

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export type CriterionKey = "industry_fit" | "company_size" | "digital_opportunity" | "growth_signals" | "project_ownership"

export type IndustryCategory =
  | "saas"
  | "software"
  | "manufacturing"
  | "industrial_supplier"
  | "association"
  | "agency"
  | "logistics"
  | "professional_services"
  | "healthcare"
  | "financial_services"
  | "retail_consumer"
  | "education"
  | "government"
  | "nonprofit"
  | "other"

export type DigitalNeedType =
  | "workflow_automation"
  | "system_integration"
  | "customer_portal"
  | "custom_software"
  | "legacy_modernization"
  | "data_reporting"

export type GrowthSignalType = "hiring" | "funding" | "expansion" | "acquisition" | "partnership" | "product_launch"

export type OwnerType = "technical_leader" | "product_leader" | "operations_leader" | "in_house_engineering"

export type CustomerType = "B2B" | "B2C" | "Enterprise" | "Government"

export type RequirementKey = "location" | "b2b" | "min_employees" | "min_revenue"

export const CRITERIA: { key: CriterionKey; label: string; description: string }[] = [
  { key: "industry_fit", label: "Industry Fit", description: "How well the company's own industry matches the target industries." },
  { key: "company_size", label: "Company Size", description: "Whether the employee count falls in a preferred range." },
  {
    key: "digital_opportunity",
    label: "Digital Opportunity",
    description: "Evidence of a need Psycray delivers: automation, integrations, portals or custom software.",
  },
  { key: "growth_signals", label: "Growth Signals", description: "Recent, verified hiring, funding, expansion or partnership news about this company." },
  {
    key: "project_ownership",
    label: "Project Ownership",
    description: "Someone who would own a software project: a technical, product or operations leader, or an in-house team.",
  },
]

export const INDUSTRY_CATEGORIES: { key: IndustryCategory; label: string }[] = [
  { key: "saas", label: "SaaS" },
  { key: "software", label: "Software" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "industrial_supplier", label: "Industrial suppliers" },
  { key: "association", label: "Associations" },
  { key: "agency", label: "Agencies" },
  { key: "logistics", label: "Logistics" },
  { key: "professional_services", label: "Professional services" },
  { key: "healthcare", label: "Healthcare" },
  { key: "financial_services", label: "Financial services" },
  { key: "retail_consumer", label: "Retail & consumer" },
  { key: "education", label: "Education" },
  { key: "government", label: "Government" },
  { key: "nonprofit", label: "Nonprofits" },
  { key: "other", label: "Other" },
]

export const DIGITAL_NEEDS: { key: DigitalNeedType; label: string }[] = [
  { key: "workflow_automation", label: "Workflow automation" },
  { key: "system_integration", label: "System integration" },
  { key: "customer_portal", label: "Customer or partner portal" },
  { key: "custom_software", label: "Custom software" },
  { key: "legacy_modernization", label: "Legacy modernisation" },
  { key: "data_reporting", label: "Data and reporting" },
]

export const GROWTH_SIGNALS: { key: GrowthSignalType; label: string }[] = [
  { key: "hiring", label: "Hiring" },
  { key: "funding", label: "Funding" },
  { key: "expansion", label: "Expansion" },
  { key: "acquisition", label: "Acquisition" },
  { key: "partnership", label: "Partnership" },
  { key: "product_launch", label: "Product launch" },
]

export const OWNER_TYPES: { key: OwnerType; label: string }[] = [
  { key: "technical_leader", label: "Technical leader" },
  { key: "product_leader", label: "Product leader" },
  { key: "operations_leader", label: "Operations leader" },
  { key: "in_house_engineering", label: "In-house engineering or IT team" },
]

const INDUSTRY_KEYS = INDUSTRY_CATEGORIES.map((c) => c.key)
const NEED_KEYS = DIGITAL_NEEDS.map((c) => c.key)
const GROWTH_KEYS = GROWTH_SIGNALS.map((c) => c.key)
const OWNER_KEYS = OWNER_TYPES.map((c) => c.key)
const CUSTOMER_KEYS: CustomerType[] = ["B2B", "B2C", "Enterprise", "Government"]

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

export interface SizeBand {
  min: number
  /** null = no upper bound */
  max: number | null
  /** Share of the Company Size weight earned, 0–1. */
  fraction: number
}

export interface IcpConfig {
  /** Version label, stamped on every score (e.g. "psycray-default-v2"). */
  version: string
  /** Minimum starting score, 0–90. score = baseline + (100 − baseline) × weightedFit. */
  baseline: number
  /** Whole percentages per criterion. Must sum to exactly 100. */
  weights: Record<CriterionKey, number>
  /** Share of the Industry Fit weight earned per category (missing = 0). */
  industryFit: Partial<Record<IndustryCategory, number>>
  /** Preferred employee ranges; must not overlap. Counts outside every band earn 0. */
  sizeBands: SizeBand[]
  digitalOpportunity: { types: DigitalNeedType[]; stated: number; inferred: number }
  /** Strength of one verified signal of each type; 0 = ignored. */
  growthSignalStrength: Record<GrowthSignalType, number>
  /** Signals older than this (relative to the research date) don't count. */
  growthWindowMonths: number
  /** Undated signals count at this share of their strength. */
  undatedSignalFactor: number
  projectOwnership: { types: OwnerType[]; stated: number; inferred: number }
  /** Preferred headquarters countries. Informational unless the location requirement is on. */
  geography: { countries: string[] }
  requirements: {
    location: { enabled: boolean }
    b2b: { enabled: boolean }
    min_employees: { enabled: boolean; value: number }
    min_revenue: { enabled: boolean; usd: number }
  }
  tiers: { high: number; moderate: number }
  /** Below this share of weight with evidence (0–100), the tier is "Needs Review". */
  minCoverageForTier: number
}

/**
 * Psycray's default ICP (version 1). Weights from the sales team,
 * 2026-11-21. Sweet spot from the account-brief prompt: U.S. B2B
 * organisations with 10–250 employees (10–50 preferred). No hard
 * requirements by default: Psycray does not require revenue or a tech stack.
 */
export const DEFAULT_ICP_CONFIG: IcpConfig = {
  version: "psycray-default-2026-11-21",
  baseline: 0,
  weights: {
    industry_fit: 20,
    company_size: 15,
    digital_opportunity: 30,
    growth_signals: 25,
    project_ownership: 10,
  },
  industryFit: {
    saas: 1,
    software: 1,
    manufacturing: 1,
    industrial_supplier: 1,
    association: 1,
    agency: 1,
    logistics: 0.5,
    professional_services: 0.5,
    healthcare: 0.25,
    financial_services: 0.25,
    education: 0.25,
    nonprofit: 0.25,
  },
  sizeBands: [
    { min: 1, max: 9, fraction: 0.25 },
    { min: 10, max: 50, fraction: 1 },
    { min: 51, max: 250, fraction: 0.7 },
    { min: 251, max: 1000, fraction: 0.25 },
  ],
  digitalOpportunity: { types: [...NEED_KEYS], stated: 1, inferred: 0.5 },
  growthSignalStrength: {
    hiring: 0.6,
    funding: 0.6,
    expansion: 0.6,
    acquisition: 0.5,
    partnership: 0.3,
    product_launch: 0.3,
  },
  growthWindowMonths: 18,
  undatedSignalFactor: 0.5,
  projectOwnership: { types: [...OWNER_KEYS], stated: 1, inferred: 0.5 },
  geography: { countries: ["United States"] },
  requirements: {
    location: { enabled: false },
    b2b: { enabled: false },
    min_employees: { enabled: false, value: 10 },
    min_revenue: { enabled: false, usd: 1_000_000 },
  },
  tiers: { high: 80, moderate: 55 },
  minCoverageForTier: 50,
}

const MAX_BASELINE = 90

/** Fills missing fields from the defaults, so older stored configs still load. */
export function normalizeConfig(raw: unknown): IcpConfig {
  const r = obj(raw)
  const d = DEFAULT_ICP_CONFIG
  const req = obj(r.requirements)
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback)
  const fractionMap = <K extends string>(v: unknown, keys: K[], fallback: Partial<Record<K, number>>) => {
    const o = obj(v)
    if (Object.keys(o).length === 0) return { ...fallback }
    const out: Partial<Record<K, number>> = {}
    for (const k of keys) if (typeof o[k] === "number") out[k] = o[k] as number
    return out
  }
  const list = <K extends string>(v: unknown, keys: K[], fallback: K[]) =>
    Array.isArray(v) ? keys.filter((k) => (v as unknown[]).includes(k)) : [...fallback]
  const dig = obj(r.digitalOpportunity)
  const own = obj(r.projectOwnership)
  const weights = obj(r.weights)
  const tiers = obj(r.tiers)
  return {
    version: clean(r.version, 80) || d.version,
    baseline: num(r.baseline, d.baseline),
    weights: Object.fromEntries(CRITERIA.map(({ key }) => [key, num(weights[key], d.weights[key])])) as IcpConfig["weights"],
    industryFit: fractionMap(r.industryFit, INDUSTRY_KEYS, d.industryFit),
    sizeBands: Array.isArray(r.sizeBands)
      ? (r.sizeBands as unknown[]).map((b) => {
          const o = obj(b)
          return { min: num(o.min, 0), max: o.max === null ? null : num(o.max, 0), fraction: num(o.fraction, 0) }
        })
      : d.sizeBands.map((b) => ({ ...b })),
    digitalOpportunity: {
      types: list(dig.types, NEED_KEYS, d.digitalOpportunity.types),
      stated: num(dig.stated, d.digitalOpportunity.stated),
      inferred: num(dig.inferred, d.digitalOpportunity.inferred),
    },
    growthSignalStrength: {
      ...d.growthSignalStrength,
      ...fractionMap(r.growthSignalStrength, GROWTH_KEYS, d.growthSignalStrength),
    } as IcpConfig["growthSignalStrength"],
    growthWindowMonths: num(r.growthWindowMonths, d.growthWindowMonths),
    undatedSignalFactor: num(r.undatedSignalFactor, d.undatedSignalFactor),
    projectOwnership: {
      types: list(own.types, OWNER_KEYS, d.projectOwnership.types),
      stated: num(own.stated, d.projectOwnership.stated),
      inferred: num(own.inferred, d.projectOwnership.inferred),
    },
    geography: {
      countries: Array.isArray(obj(r.geography).countries)
        ? uniqueBy((obj(r.geography).countries as unknown[]).map((c) => normalizeCountry(String(c))).filter(Boolean), (c) => c)
        : [...d.geography.countries],
    },
    requirements: {
      location: { enabled: obj(req.location).enabled === true },
      b2b: { enabled: obj(req.b2b).enabled === true },
      min_employees: {
        enabled: obj(req.min_employees).enabled === true,
        value: num(obj(req.min_employees).value, d.requirements.min_employees.value),
      },
      min_revenue: {
        enabled: obj(req.min_revenue).enabled === true,
        usd: num(obj(req.min_revenue).usd, d.requirements.min_revenue.usd),
      },
    },
    tiers: { high: num(tiers.high, d.tiers.high), moderate: num(tiers.moderate, d.tiers.moderate) },
    minCoverageForTier: num(r.minCoverageForTier, d.minCoverageForTier),
  }
}

/** Every rule a publishable configuration must satisfy. Empty = valid. */
export function validateConfig(config: IcpConfig): string[] {
  const errors: string[] = []
  const inRange = (v: number, lo: number, hi: number) => Number.isFinite(v) && v >= lo && v <= hi
  const frac = (v: number) => inRange(v, 0, 1)

  for (const { key, label } of CRITERIA) {
    const w = config.weights[key]
    if (!Number.isInteger(w) || w < 0 || w > 100) errors.push(`${label} weight must be a whole number from 0 to 100.`)
  }
  const total = CRITERIA.reduce((sum, c) => sum + config.weights[c.key], 0)
  if (total !== 100) errors.push(`Weights must total exactly 100% (currently ${total}%).`)
  if (!Number.isInteger(config.baseline) || !inRange(config.baseline, 0, MAX_BASELINE)) {
    errors.push(`Baseline must be a whole number from 0 to ${MAX_BASELINE}.`)
  }
  for (const [k, v] of Object.entries(config.industryFit)) if (!frac(v as number)) errors.push(`Industry fit for ${k} must be 0–100%.`)
  if (!Object.values(config.industryFit).some((v) => (v as number) > 0)) errors.push("Choose at least one target industry.")

  const bands = [...config.sizeBands].sort((a, b) => a.min - b.min)
  bands.forEach((b, i) => {
    if (!Number.isInteger(b.min) || b.min < 1) errors.push("Employee ranges must start at 1 or more.")
    if (b.max !== null && (!Number.isInteger(b.max) || b.max < b.min)) errors.push(`Employee range ${b.min}–${b.max} ends before it starts.`)
    if (!frac(b.fraction)) errors.push("Employee range fit must be 0–100%.")
    const next = bands[i + 1]
    if (next && (b.max === null || b.max >= next.min)) errors.push(`Employee ranges overlap around ${next.min}.`)
  })
  if (!bands.some((b) => b.fraction > 0)) errors.push("Add at least one preferred employee range.")

  const { digitalOpportunity: dig, projectOwnership: own } = config
  if (!frac(dig.stated) || !frac(dig.inferred)) errors.push("Digital opportunity credits must be 0–100%.")
  if (dig.inferred > dig.stated) errors.push("Inferred digital needs can't earn more than stated ones.")
  if (!frac(own.stated) || !frac(own.inferred)) errors.push("Project ownership credits must be 0–100%.")
  if (own.inferred > own.stated) errors.push("Inferred project owners can't earn more than stated ones.")
  for (const [k, v] of Object.entries(config.growthSignalStrength)) if (!frac(v as number)) errors.push(`Growth signal strength for ${k} must be 0–100%.`)
  if (!Number.isInteger(config.growthWindowMonths) || !inRange(config.growthWindowMonths, 1, 60)) {
    errors.push("Growth signal window must be 1–60 months.")
  }
  if (!frac(config.undatedSignalFactor)) errors.push("Undated signal credit must be 0–100%.")

  const req = config.requirements
  if (req.location.enabled && config.geography.countries.length === 0) errors.push("Add at least one country to require a location.")
  if (req.min_employees.enabled && (!Number.isInteger(req.min_employees.value) || req.min_employees.value < 1)) {
    errors.push("Minimum employee count must be a whole number of 1 or more.")
  }
  if (req.min_revenue.enabled && !(req.min_revenue.usd > 0)) errors.push("Minimum annual revenue must be more than $0.")

  if (!inRange(config.tiers.moderate, 1, 100) || !inRange(config.tiers.high, 1, 100) || config.tiers.moderate >= config.tiers.high) {
    errors.push("Tier thresholds must satisfy 0 < Moderate < High ≤ 100.")
  }
  if (!inRange(config.minCoverageForTier, 0, 100)) errors.push("Minimum evidence coverage must be 0–100%.")
  return uniqueBy(errors, (e) => e)
}

/** Human-readable list of what differs between two configurations. */
export function describeConfigChanges(before: IcpConfig, after: IcpConfig): { kind: "baseline" | "weights" | "criteria" | "requirements" | "tiers"; text: string }[] {
  const out: { kind: "baseline" | "weights" | "criteria" | "requirements" | "tiers"; text: string }[] = []
  const pct = (v: number) => `${Math.round(v * 100)}%`
  if (before.baseline !== after.baseline) out.push({ kind: "baseline", text: `Baseline ${before.baseline} → ${after.baseline}` })
  for (const { key, label } of CRITERIA) {
    if (before.weights[key] !== after.weights[key]) {
      out.push({ kind: "weights", text: `${label} weight ${before.weights[key]}% → ${after.weights[key]}%` })
    }
  }
  for (const { key, label } of INDUSTRY_CATEGORIES) {
    const a = before.industryFit[key] ?? 0
    const b = after.industryFit[key] ?? 0
    if (a !== b) out.push({ kind: "criteria", text: `Industry "${label}" ${pct(a)} → ${pct(b)}` })
  }
  if (canonicalJson(before.sizeBands) !== canonicalJson(after.sizeBands)) out.push({ kind: "criteria", text: "Employee ranges changed" })
  if (canonicalJson(before.digitalOpportunity) !== canonicalJson(after.digitalOpportunity)) out.push({ kind: "criteria", text: "Digital opportunity rules changed" })
  if (
    canonicalJson(before.growthSignalStrength) !== canonicalJson(after.growthSignalStrength) ||
    before.growthWindowMonths !== after.growthWindowMonths ||
    before.undatedSignalFactor !== after.undatedSignalFactor
  ) {
    out.push({ kind: "criteria", text: "Growth signal rules changed" })
  }
  if (canonicalJson(before.projectOwnership) !== canonicalJson(after.projectOwnership)) out.push({ kind: "criteria", text: "Project ownership rules changed" })
  if (canonicalJson(before.geography) !== canonicalJson(after.geography)) {
    out.push({ kind: "criteria", text: `Preferred locations: ${after.geography.countries.join(", ") || "none"}` })
  }
  const req = (c: IcpConfig) => REQUIREMENT_LABELS.filter(({ key }) => c.requirements[key].enabled).map(({ key }) => requirementLabel(key, c))
  if (canonicalJson(req(before)) !== canonicalJson(req(after))) {
    out.push({ kind: "requirements", text: `Hard requirements: ${req(after).join("; ") || "none"}` })
  }
  if (canonicalJson(before.tiers) !== canonicalJson(after.tiers) || before.minCoverageForTier !== after.minCoverageForTier) {
    out.push({ kind: "tiers", text: "Tier thresholds changed" })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export type Basis = "stated" | "inferred"

/** A quote or paraphrase plus where it came from. */
export interface EvidenceRef {
  text: string
  source: string
  /** True when `source` is the company's own site or a URL the research actually retrieved. */
  verified: boolean
}

/** Canonical evidence the engine scores. Produced by `normalizeEvidence`. */
export interface IcpEvidence {
  domain: string
  /** ISO timestamp of the research run. Recency is measured from here, never from "now". */
  researched_at: string
  /** Number of external search results the research reviewed. */
  external_results: number
  industry: { category: IndustryCategory; label: string; evidence: EvidenceRef } | null
  employee_counts: { min: number; max: number; evidence: EvidenceRef }[]
  digital_needs: { type: DigitalNeedType; basis: Basis; evidence: EvidenceRef }[]
  growth_signals: {
    type: GrowthSignalType
    date: string | null
    about_target: boolean
    evidence: EvidenceRef
  }[]
  owners: { type: OwnerType; basis: Basis; evidence: EvidenceRef }[]
  hq_country: string | null
  /** Added in engine v3; absent in evidence saved by v2. */
  customer_types?: { type: CustomerType; evidence: EvidenceRef }[]
  /** Added in engine v3; absent in evidence saved by v2. */
  revenue?: { min_usd: number; max_usd: number; evidence: EvidenceRef }[]
  unknowns: string[]
}

export interface NormalizeContext {
  domain: string
  researched_at: string
  /** External search results the research retrieved (the company's own site is always trusted). */
  external_urls: string[]
  /** Unknowns listed by the synthesis step, kept as missing information. */
  unknowns?: string[]
  /** Customer types from the company-facts step (company website), used when the classifier gives none. */
  facts_customer_types?: string[]
}

/* ------------------------------------------------------------------ */
/* Result                                                              */
/* ------------------------------------------------------------------ */

export type CriterionStatus = "met" | "partial" | "not_met" | "unknown" | "conflicting"
export type RequirementStatus = "pass" | "fail" | "unknown"
export type Qualification = "qualified" | "disqualified" | "unverified" | "no_requirements"

export interface CriterionResult {
  key: CriterionKey
  criterion: string
  /** Points earned towards the score, one decimal. */
  score: number
  /** Points available = (100 − baseline) × weight / 100. */
  max: number
  weight: number
  /** Share of the weight earned, 0–1. */
  fraction: number
  status: CriterionStatus
  reason: string
  evidence: EvidenceRef[]
}

export interface RequirementResult {
  key: RequirementKey
  requirement: string
  status: RequirementStatus
  reason: string
  evidence: EvidenceRef[]
}

export type ChangeKind = "algorithm" | "configuration" | "evidence" | "unchanged"

export interface ScoreChange {
  previous_score: number | null
  updated_score: number | null
  delta: number | null
  /** Plain-text reasons (same text as `details`), kept for older readers. */
  reasons: string[]
  /** Reasons tagged by cause, so configuration changes read apart from new evidence. */
  details: { kind: ChangeKind; text: string }[]
  /** Points explained by the configuration (baseline, weights, rules). Null when not separable. */
  config_effect: number | null
  /** Points explained by different evidence. Null when not separable. */
  evidence_effect: number | null
  criteria: { criterion: string; previous: number | null; updated: number; delta: number | null }[]
}

export interface ScoreSummary {
  score: number | null
  tier: string | null
  algorithm_version: string
  config_version: string | null
  baseline: number
  weights: Partial<Record<CriterionKey, number>> | null
  snapshot_id: string | null
  evidence_fingerprint: string | null
  calculated_at: string | null
  criteria: {
    key?: CriterionKey
    criterion: string
    score: number
    max: number
    fraction?: number
    status: string
    evidence?: EvidenceRef[]
  }[]
}

export type Tier = "High Fit" | "Moderate Fit" | "Low Fit" | "Needs Review"

export interface IcpScoreResult {
  /** Supported score: unknown criteria count as unmet. */
  score: number
  tier: Tier
  /** Score if every unknown criterion turned out fully met. */
  max_possible: number
  /** Tier at max_possible; differs from `tier` when unknowns could change the tier. */
  tier_if_unknowns_met: Tier
  criteria: CriterionResult[]
  /** Share of the total weight that had evidence (0–100). */
  coverage: number
  missing: string[]
  baseline: number
  weights: Record<CriterionKey, number>
  requirements: RequirementResult[]
  qualification: Qualification
  /** Headquarters inside the preferred locations; null when unknown or none configured. */
  in_preferred_location: boolean | null
  algorithm_version: string
  config_version: string
  evidence_fingerprint: string
  /** Set by the caller (research run / recalculation), not by the engine. */
  snapshot_id: string | null
  config_version_id: number | null
  calculated_at: string | null
  previous: ScoreSummary | null
  change: ScoreChange | null
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function clean(value: unknown, max = 400): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""
}

function oneOf<T extends string>(value: unknown, allowed: T[]): T | null {
  const v = clean(value).toLowerCase().replace(/[\s-]+/g, "_")
  return (allowed as string[]).includes(v) ? (v as T) : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/** Hostname without "www.", lower case. Regex only: n8n's sandbox has no URL global. */
export function hostOf(url: string): string {
  const m = clean(url).toLowerCase().match(/^(?:https?:\/\/)?([^/?#:\s]+)/)
  return m ? m[1].replace(/^www\./, "") : ""
}

function normalizeUrl(url: string): string {
  return clean(url).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/#?]+$/, "")
}

function isOnDomain(host: string, domain: string): boolean {
  return host !== "" && (host === domain || host.endsWith("." + domain))
}

function ref(text: unknown, source: unknown, ctx: { domain: string; retrieved: Set<string> }): EvidenceRef {
  const src = clean(source, 300)
  const host = hostOf(src)
  const verified =
    src !== "" &&
    (isOnDomain(host, ctx.domain) || ctx.retrieved.has(normalizeUrl(src)) || src.toLowerCase() === ctx.domain)
  return { text: clean(text), source: src, verified }
}

function toDate(value: unknown): string | null {
  const s = clean(value, 40)
  if (!/^\d{4}-\d{2}(-\d{2})?/.test(s)) return null
  const t = Date.parse(s.length === 7 ? s + "-01" : s)
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10)
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value)
  if (typeof value === "string") {
    const n = Number(value.replace(/[,\s+$]/g, ""))
    return Number.isFinite(n) && value.trim() !== "" ? Math.round(n) : null
  }
  return null
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function byKey<T>(key: (item: T) => string) {
  return (a: T, b: T) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0)
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const COUNTRY_ALIASES: Record<string, string> = {
  us: "United States",
  usa: "United States",
  "united states": "United States",
  "united states of america": "United States",
  america: "United States",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
}

/** "USA", "U.S.", "united states" → "United States". Other names are title-cased. */
export function normalizeCountry(value: string): string {
  const key = clean(value, 80).toLowerCase().replace(/\./g, "").replace(/^the /, "")
  if (!key) return ""
  return COUNTRY_ALIASES[key] ?? key.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** JSON with sorted keys, so equal values always serialise identically. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]"
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>
    return (
      "{" +
      Object.keys(o)
        .filter((k) => o[k] !== undefined)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonicalJson(o[k]))
        .join(",") +
      "}"
    )
  }
  return JSON.stringify(value ?? null)
}

/** Deterministic 64-bit content hash (cyrb53, hex). Not cryptographic. */
export function fingerprint(value: unknown): string {
  const str = canonicalJson(value)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0")
}

/* ------------------------------------------------------------------ */
/* Normalisation: raw LLM classification → canonical evidence          */
/* ------------------------------------------------------------------ */

/**
 * Validates and canonicalises the evidence classifier's JSON.
 * Unknown enum values are dropped, sources are checked against what the
 * research actually retrieved, duplicates are removed and every list is
 * sorted, so the LLM's ordering or phrasing of the same facts can't move
 * the score.
 */
export function normalizeEvidence(raw: unknown, context: NormalizeContext): IcpEvidence {
  const domain = hostOf(context.domain)
  const retrieved = new Set(asArray(context.external_urls).map((u) => normalizeUrl(String(u))))
  const ctx = { domain, retrieved }
  const r = obj(raw)

  const ind = obj(r.industry)
  const category = oneOf(ind.category, INDUSTRY_KEYS)
  const industry = category
    ? { category, label: clean(ind.label, 120), evidence: ref(ind.evidence, ind.source, ctx) }
    : null

  const ranges = (items: unknown, minKey: string, maxKey: string) =>
    asArray(items)
      .map((item) => {
        const e = obj(item)
        let min = toNumber(e[minKey] ?? e.value)
        let max = toNumber(e[maxKey] ?? e.value)
        if (min === null && max !== null) min = max
        if (max === null && min !== null) max = min
        if (min === null || max === null || min < 1) return null
        if (max < min) [min, max] = [max, min]
        return { min, max, evidence: ref(e.evidence, e.source, ctx) }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(byKey((x) => `${String(x.min).padStart(15, "0")}|${String(x.max).padStart(15, "0")}|${x.evidence.source}`))

  const employee_counts = uniqueBy(ranges(r.employee_count_evidence, "min", "max"), (x) => `${x.min}|${x.max}|${x.evidence.source}`)
  const revenue = uniqueBy(
    ranges(r.annual_revenue_evidence, "min_usd", "max_usd").map((x) => ({ min_usd: x.min, max_usd: x.max, evidence: x.evidence })),
    (x) => `${x.min_usd}|${x.max_usd}|${x.evidence.source}`,
  )

  const digital_needs = uniqueBy(
    asArray(r.digital_needs)
      .map((item) => {
        const e = obj(item)
        const type = oneOf(e.type, NEED_KEYS)
        const basis = oneOf(e.basis, ["stated", "inferred"] as Basis[]) ?? "inferred"
        return type ? { type, basis, evidence: ref(e.evidence, e.source, ctx) } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(byKey((x) => `${x.type}|${x.basis}|${x.evidence.source}|${x.evidence.text}`)),
    (x) => `${x.type}|${x.basis}|${x.evidence.source}`,
  )

  const growth_signals = uniqueBy(
    asArray(r.growth_signals)
      .map((item) => {
        const e = obj(item)
        const type = oneOf(e.type, GROWTH_KEYS)
        if (!type) return null
        return {
          type,
          date: toDate(e.date),
          about_target: e.about_target === true,
          evidence: ref(e.evidence, e.source_url ?? e.source, ctx),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(byKey((x) => `${x.type}|${x.date ?? ""}|${x.evidence.source}|${x.evidence.text}`)),
    (x) => `${x.type}|${x.date ?? ""}|${x.evidence.source}`,
  )

  const owners = uniqueBy(
    asArray(r.project_owners)
      .map((item) => {
        const e = obj(item)
        const type = oneOf(e.type, OWNER_KEYS)
        const basis = oneOf(e.basis, ["stated", "inferred"] as Basis[]) ?? "inferred"
        return type ? { type, basis, evidence: ref(e.evidence, e.source, ctx) } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(byKey((x) => `${x.type}|${x.basis}|${x.evidence.source}|${x.evidence.text}`)),
    (x) => `${x.type}|${x.basis}|${x.evidence.source}`,
  )

  const customerType = (v: unknown) => CUSTOMER_KEYS.find((k) => k.toLowerCase() === clean(v, 20).toLowerCase()) ?? null
  const classified = asArray(r.customer_types)
    .map((item) => {
      const e = obj(item)
      const type = customerType(e.type)
      return type ? { type, evidence: ref(e.evidence, e.source, ctx) } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
  const fromFacts = asArray(context.facts_customer_types)
    .map(customerType)
    .filter((t): t is CustomerType => t !== null)
    .map((type) => ({ type, evidence: { text: `Customer type on the company website: ${type}`, source: domain, verified: true } }))
  const customer_types = uniqueBy(
    (classified.length > 0 ? classified : fromFacts).sort(byKey((x) => `${x.type}|${x.evidence.source}`)),
    (x) => x.type,
  )

  const unknowns = uniqueBy(
    asArray(context.unknowns)
      .map((u) => clean(u, 200))
      .filter(Boolean),
    (u) => u.toLowerCase(),
  ).sort()

  return {
    domain,
    researched_at: clean(context.researched_at, 40),
    external_results: retrieved.size,
    industry,
    employee_counts,
    digital_needs,
    growth_signals,
    owners,
    hq_country: normalizeCountry(clean(r.hq_country, 80)) || null,
    customer_types,
    revenue,
    unknowns,
  }
}

/**
 * Adds customer types from the saved company facts to evidence saved
 * before engine v3 (which didn't classify them). Pure; evidence that
 * already has customer types is returned unchanged.
 */
export function supplementEvidence(evidence: IcpEvidence, companyFacts: unknown): IcpEvidence {
  if (evidence.customer_types !== undefined) return evidence
  const facts = obj(companyFacts)
  const types = asArray(facts.customer_types)
    .map((v) => CUSTOMER_KEYS.find((k) => k.toLowerCase() === clean(v, 20).toLowerCase()) ?? null)
    .filter((t): t is CustomerType => t !== null)
  return {
    ...evidence,
    customer_types: uniqueBy(types, (t) => t)
      .sort()
      .map((type) => ({ type, evidence: { text: `Customer type on the company website: ${type}`, source: evidence.domain, verified: true } })),
  }
}

/* ------------------------------------------------------------------ */
/* Criteria                                                            */
/* ------------------------------------------------------------------ */

interface Assessment {
  fraction: number
  status: CriterionStatus
  reason: string
  evidence: EvidenceRef[]
}

const labelOf = <K extends string>(list: { key: K; label: string }[], key: K) => list.find((x) => x.key === key)?.label ?? key

function bandLabel(b: SizeBand): string {
  return b.max === null ? `${b.min.toLocaleString("en-US")}+ employees` : `${b.min.toLocaleString("en-US")}–${b.max.toLocaleString("en-US")} employees`
}

function assessIndustry(ev: IcpEvidence, cfg: IcpConfig): Assessment {
  if (!ev.industry) {
    return { fraction: 0, status: "unknown", reason: "The company's own industry could not be determined", evidence: [] }
  }
  const fraction = cfg.industryFit[ev.industry.category] ?? 0
  const name = ev.industry.label || labelOf(INDUSTRY_CATEGORIES, ev.industry.category)
  const fit = fraction >= 1 ? "core target industry" : fraction > 0 ? `partial fit (${Math.round(fraction * 100)}%)` : "not a target industry"
  return {
    fraction,
    status: fraction >= 1 ? "met" : fraction > 0 ? "partial" : "not_met",
    reason: `${name}: ${fit}`,
    evidence: [ev.industry.evidence],
  }
}

function bandFor(count: number, cfg: IcpConfig): SizeBand | null {
  return cfg.sizeBands.find((b) => count >= b.min && (b.max === null || count <= b.max)) ?? null
}

function assessSize(ev: IcpEvidence, cfg: IcpConfig): Assessment {
  if (ev.employee_counts.length === 0) {
    return { fraction: 0, status: "unknown", reason: "No employee count found", evidence: [] }
  }
  // Each report is a range; judge it by the band of both ends.
  const bands = ev.employee_counts.flatMap((c) => [bandFor(c.min, cfg), bandFor(c.max, cfg)])
  const labels = uniqueBy(bands.map((b) => (b ? bandLabel(b) : "outside the preferred ranges")), (l) => l)
  const fraction = Math.min(...bands.map((b) => b?.fraction ?? 0))
  const evidence = ev.employee_counts.map((c) => c.evidence)
  const range = (c: { min: number; max: number }) => (c.min === c.max ? `${c.min}` : `${c.min}–${c.max}`)
  if (labels.length > 1) {
    return {
      fraction,
      status: "conflicting",
      reason: `Sources disagree (${ev.employee_counts.map(range).join(" vs ")} employees); scored on the lower-fit reading`,
      evidence,
    }
  }
  return {
    fraction,
    status: fraction >= 1 ? "met" : fraction > 0 ? "partial" : "not_met",
    reason: `${ev.employee_counts.map(range).join(", ")} employees: ${labels[0]}${fraction > 0 && fraction < 1 ? ` (${Math.round(fraction * 100)}%)` : ""}`,
    evidence,
  }
}

function assessDigital(ev: IcpEvidence, cfg: IcpConfig): Assessment {
  const usable = ev.digital_needs.filter(
    (n) => cfg.digitalOpportunity.types.includes(n.type) && (n.basis === "inferred" || n.evidence.verified),
  )
  if (usable.length === 0) {
    return {
      fraction: 0,
      status: "unknown",
      reason: "No need for the selected services was found in the sources reviewed",
      evidence: [],
    }
  }
  const stated = usable.filter((n) => n.basis === "stated")
  const chosen = stated.length > 0 ? stated : usable
  const fraction = stated.length > 0 ? cfg.digitalOpportunity.stated : cfg.digitalOpportunity.inferred
  const types = uniqueBy(chosen.map((n) => labelOf(DIGITAL_NEEDS, n.type).toLowerCase()), (t) => t)
  return {
    fraction,
    status: fraction >= 1 ? "met" : fraction > 0 ? "partial" : "not_met",
    reason: `${stated.length > 0 ? "Stated" : "Inferred (not stated by a source)"} need: ${types.join(", ")}`,
    evidence: chosen.map((n) => n.evidence),
  }
}

function monthsBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / (1000 * 60 * 60 * 24 * 30.4375)
}

function assessGrowth(ev: IcpEvidence, cfg: IcpConfig): Assessment {
  const about = ev.growth_signals.filter((s) => s.about_target && (cfg.growthSignalStrength[s.type] ?? 0) > 0)
  const qualifying = about.filter((s) => {
    if (!s.evidence.verified) return false
    if (s.date === null) return true
    const age = monthsBetween(s.date, ev.researched_at)
    return age <= cfg.growthWindowMonths && age >= -1
  })
  if (qualifying.length === 0) {
    if (ev.external_results === 0) {
      return { fraction: 0, status: "unknown", reason: "No external sources were found to check for growth", evidence: [] }
    }
    const excluded = ev.growth_signals.length - qualifying.length
    return {
      fraction: 0,
      status: about.length > 0 ? "not_met" : "unknown",
      reason:
        about.length > 0
          ? `No verified growth signal in the last ${cfg.growthWindowMonths} months`
          : `No counted growth signal about this company was found${excluded > 0 ? ` (${excluded} excluded: other companies, unverifiable or ignored types)` : ""}`,
      evidence: [],
    }
  }
  // Strongest signal per type counts once; dated beats undated.
  const best = new Map<GrowthSignalType, { strength: number; signal: (typeof qualifying)[number] }>()
  for (const s of qualifying) {
    const strength = cfg.growthSignalStrength[s.type] * (s.date === null ? cfg.undatedSignalFactor : 1)
    const current = best.get(s.type)
    if (!current || strength > current.strength) best.set(s.type, { strength, signal: s })
  }
  const picked = [...best.values()].sort(byKey((x) => x.signal.type))
  const fraction = Math.min(1, picked.reduce((sum, x) => sum + x.strength, 0))
  return {
    fraction,
    status: fraction >= 1 ? "met" : fraction > 0 ? "partial" : "not_met",
    reason: `Verified signals: ${picked.map((x) => labelOf(GROWTH_SIGNALS, x.signal.type).toLowerCase() + (x.signal.date ? ` (${x.signal.date})` : " (undated)")).join(", ")}`,
    evidence: picked.map((x) => x.signal.evidence),
  }
}

function assessOwnership(ev: IcpEvidence, cfg: IcpConfig): Assessment {
  const usable = ev.owners.filter(
    (o) => cfg.projectOwnership.types.includes(o.type) && (o.basis === "inferred" || o.evidence.verified),
  )
  if (usable.length === 0) {
    return { fraction: 0, status: "unknown", reason: "No one identified who would own a technology project", evidence: [] }
  }
  const stated = usable.filter((o) => o.basis === "stated")
  const chosen = stated.length > 0 ? stated : usable
  const fraction = stated.length > 0 ? cfg.projectOwnership.stated : cfg.projectOwnership.inferred
  return {
    fraction,
    status: fraction >= 1 ? "met" : fraction > 0 ? "partial" : "not_met",
    reason: `${stated.length > 0 ? "Identified" : "Likely (inferred)"}: ${uniqueBy(chosen.map((o) => labelOf(OWNER_TYPES, o.type).toLowerCase()), (t) => t).join(", ")}`,
    evidence: chosen.map((o) => o.evidence),
  }
}

const ASSESSORS: Record<CriterionKey, (ev: IcpEvidence, cfg: IcpConfig) => Assessment> = {
  industry_fit: assessIndustry,
  company_size: assessSize,
  digital_opportunity: assessDigital,
  growth_signals: assessGrowth,
  project_ownership: assessOwnership,
}

/* ------------------------------------------------------------------ */
/* Hard requirements                                                   */
/* ------------------------------------------------------------------ */

export const REQUIREMENT_LABELS: { key: RequirementKey; label: string; description: string }[] = [
  { key: "location", label: "Located in a preferred country", description: "Headquarters must be in one of the preferred locations." },
  { key: "b2b", label: "Sells to businesses (B2B)", description: "The company must sell to businesses, enterprises or government." },
  { key: "min_employees", label: "Minimum employee count", description: "Every reported headcount must be at or above the minimum." },
  { key: "min_revenue", label: "Minimum annual revenue", description: "Reported annual revenue must be at or above the minimum." },
]

export function requirementLabel(key: RequirementKey, cfg: IcpConfig): string {
  const r = cfg.requirements
  if (key === "location") return `Headquartered in ${cfg.geography.countries.join(" or ") || "a preferred country"}`
  if (key === "b2b") return "Sells to businesses (B2B)"
  if (key === "min_employees") return `At least ${r.min_employees.value.toLocaleString("en-US")} employees`
  return `At least $${r.min_revenue.usd.toLocaleString("en-US")} annual revenue`
}

function checkRange(
  items: { min: number; max: number; evidence: EvidenceRef }[],
  threshold: number,
  noun: string,
  fmt: (n: number) => string,
): Omit<RequirementResult, "key" | "requirement"> {
  if (items.length === 0) return { status: "unknown", reason: `No ${noun} found, so this can't be checked`, evidence: [] }
  const lowest = Math.min(...items.map((i) => i.min))
  const highest = Math.max(...items.map((i) => i.max))
  const evidence = items.map((i) => i.evidence)
  if (lowest >= threshold) return { status: "pass", reason: `Reported ${noun} ${fmt(lowest)}+ meets ${fmt(threshold)}`, evidence }
  if (highest < threshold) return { status: "fail", reason: `Reported ${noun} ${fmt(highest)} is below ${fmt(threshold)}`, evidence }
  return { status: "unknown", reason: `Reported ${noun} (${fmt(lowest)}–${fmt(highest)}) straddles ${fmt(threshold)}`, evidence }
}

function assessRequirements(ev: IcpEvidence, cfg: IcpConfig): RequirementResult[] {
  const out: RequirementResult[] = []
  const add = (key: RequirementKey, r: Omit<RequirementResult, "key" | "requirement">) =>
    out.push({ key, requirement: requirementLabel(key, cfg), ...r })
  const req = cfg.requirements

  if (req.location.enabled) {
    if (!ev.hq_country) add("location", { status: "unknown", reason: "Headquarters country not found", evidence: [] })
    else {
      const ok = cfg.geography.countries.includes(ev.hq_country)
      add("location", { status: ok ? "pass" : "fail", reason: `Headquartered in ${ev.hq_country}`, evidence: [] })
    }
  }
  if (req.b2b.enabled) {
    const types = ev.customer_types ?? []
    const business = types.filter((t) => t.type !== "B2C")
    if (types.length === 0) add("b2b", { status: "unknown", reason: "Customer type not found", evidence: [] })
    else if (business.length > 0) {
      add("b2b", { status: "pass", reason: `Sells to ${business.map((t) => t.type).join(", ")}`, evidence: business.map((t) => t.evidence) })
    } else add("b2b", { status: "fail", reason: "Sells to consumers only (B2C)", evidence: types.map((t) => t.evidence) })
  }
  if (req.min_employees.enabled) {
    add("min_employees", checkRange(ev.employee_counts, req.min_employees.value, "headcount", (n) => n.toLocaleString("en-US")))
  }
  if (req.min_revenue.enabled) {
    const items = (ev.revenue ?? []).map((r) => ({ min: r.min_usd, max: r.max_usd, evidence: r.evidence }))
    add("min_revenue", checkRange(items, req.min_revenue.usd, "revenue", (n) => `$${n.toLocaleString("en-US")}`))
  }
  return out
}

function qualificationOf(requirements: RequirementResult[]): Qualification {
  if (requirements.length === 0) return "no_requirements"
  if (requirements.some((r) => r.status === "fail")) return "disqualified"
  if (requirements.some((r) => r.status === "unknown")) return "unverified"
  return "qualified"
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

function tierFor(score: number, coverage: number, cfg: IcpConfig): Tier {
  if (coverage < cfg.minCoverageForTier) return "Needs Review"
  return score >= cfg.tiers.high ? "High Fit" : score >= cfg.tiers.moderate ? "Moderate Fit" : "Low Fit"
}

/**
 * Pure: identical (evidence, config) always gives an identical result.
 *
 *   weightedFit     = Σ weight × fit / 100, over criteria with evidence (0–1)
 *   score           = baseline + (100 − baseline) × weightedFit
 *   max_possible    = same, counting unknown criteria as fully met
 *   criterion score = (100 − baseline) × weight × fit / 100
 */
export function scoreCompany(evidence: IcpEvidence, config: IcpConfig = DEFAULT_ICP_CONFIG): IcpScoreResult {
  const errors = validateConfig(config)
  if (errors.length > 0) throw new Error(`Invalid ICP configuration: ${errors.join(" ")}`)

  const span = 100 - config.baseline
  let known = 0
  let unknownWeight = 0
  const criteria: CriterionResult[] = CRITERIA.map(({ key, label }) => {
    const a = ASSESSORS[key](evidence, config)
    const weight = config.weights[key]
    const fraction = Math.max(0, Math.min(1, a.fraction))
    if (a.status === "unknown") unknownWeight += weight
    else known += weight * fraction
    return {
      key,
      criterion: label,
      score: round1((span * weight * fraction) / 100),
      max: round1((span * weight) / 100),
      weight,
      fraction: Math.round(fraction * 1000) / 1000,
      status: a.status,
      reason: a.reason,
      evidence: a.evidence,
    }
  })

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
  // known and unknownWeight are in weight-percent (0–100), so weightedFit = known / 100
  const score = clamp(config.baseline + (span * known) / 100)
  const max_possible = clamp(config.baseline + (span * (known + unknownWeight)) / 100)
  const coverage = 100 - unknownWeight
  const requirements = assessRequirements(evidence, config)
  const countries = config.geography.countries

  return {
    score,
    tier: tierFor(score, coverage, config),
    max_possible,
    tier_if_unknowns_met: tierFor(max_possible, 100, config),
    criteria,
    coverage,
    missing: [
      ...criteria.filter((c) => c.status === "unknown").map((c) => `${c.criterion}: ${c.reason}`),
      ...requirements.filter((r) => r.status === "unknown").map((r) => `${r.requirement}: ${r.reason}`),
      ...evidence.unknowns,
    ],
    baseline: config.baseline,
    weights: { ...config.weights },
    requirements,
    qualification: qualificationOf(requirements),
    in_preferred_location: evidence.hq_country && countries.length > 0 ? countries.includes(evidence.hq_country) : null,
    algorithm_version: ICP_ALGORITHM_VERSION,
    config_version: config.version,
    evidence_fingerprint: fingerprint(evidence),
    snapshot_id: null,
    config_version_id: null,
    calculated_at: null,
    previous: null,
    change: null,
  }
}

/* ------------------------------------------------------------------ */
/* Comparison: previous score → new score                              */
/* ------------------------------------------------------------------ */

/**
 * Reduces any stored score (any engine version, or the legacy keyword
 * rules) to the fields needed for a comparison. Null when there is nothing.
 */
export function summarizeStored(stored: unknown, storedScore?: unknown, storedTier?: unknown): ScoreSummary | null {
  const s = obj(stored)
  const criteria = asArray(s.criteria)
    .map((c) => obj(c))
    .filter((c) => typeof c.criterion === "string" && typeof c.score === "number")
    .map((c) => ({
      key: (typeof c.key === "string" ? c.key : undefined) as CriterionKey | undefined,
      criterion: c.criterion as string,
      score: c.score as number,
      max: typeof c.max === "number" ? c.max : 0,
      fraction: typeof c.fraction === "number" ? c.fraction : undefined,
      status: typeof c.status === "string" ? c.status : "unknown",
      evidence: asArray(c.evidence).map((e) => obj(e) as unknown as EvidenceRef),
    }))
  const score = typeof s.score === "number" ? s.score : typeof storedScore === "number" ? storedScore : null
  if (score === null && criteria.length === 0) return null
  return {
    score,
    tier: typeof s.tier === "string" ? s.tier : typeof storedTier === "string" ? storedTier : null,
    algorithm_version: typeof s.algorithm_version === "string" ? s.algorithm_version : LEGACY_ALGORITHM_VERSION,
    config_version: typeof s.config_version === "string" ? s.config_version : null,
    baseline: typeof s.baseline === "number" ? s.baseline : 0,
    weights: Object.keys(obj(s.weights)).length ? (obj(s.weights) as Partial<Record<CriterionKey, number>>) : null,
    snapshot_id: typeof s.snapshot_id === "string" ? s.snapshot_id : null,
    evidence_fingerprint: typeof s.evidence_fingerprint === "string" ? s.evidence_fingerprint : null,
    calculated_at: typeof s.calculated_at === "string" ? s.calculated_at : null,
    criteria,
  }
}

export function toSummary(result: IcpScoreResult): ScoreSummary {
  return {
    score: result.score,
    tier: result.tier,
    algorithm_version: result.algorithm_version,
    config_version: result.config_version,
    baseline: result.baseline,
    weights: { ...result.weights },
    snapshot_id: result.snapshot_id,
    evidence_fingerprint: result.evidence_fingerprint,
    calculated_at: result.calculated_at,
    criteria: result.criteria.map((c) => ({
      key: c.key,
      criterion: c.criterion,
      score: c.score,
      max: c.max,
      fraction: c.fraction,
      status: c.status,
      evidence: c.evidence,
    })),
  }
}

function fmtDelta(n: number): string {
  const v = round1(n)
  return (v > 0 ? "+" : "") + v
}

const evidenceKey = (e: EvidenceRef) => `${e.text.toLowerCase()}|${e.source.toLowerCase()}`
const isLegacy = (v: string) => v === LEGACY_ALGORITHM_VERSION
const major = (v: string) => v.split(".")[0]

/**
 * Explains a score change using only recorded differences, and attributes
 * the points to their cause:
 *   - configuration: baseline, weights or criteria rules (same evidence)
 *   - evidence: what the research found
 * When both changed, the configuration's share is measured by applying the
 * new configuration to the old criterion results (old fit × new weight and
 * baseline); the rest is the evidence's share.
 */
export function compareScores(previous: ScoreSummary | null, next: IcpScoreResult): ScoreChange | null {
  if (!previous) return null
  const details: { kind: ChangeKind; text: string }[] = []
  const delta = previous.score === null ? null : round1(next.score - previous.score)
  const pairs = next.criteria.map((c) => ({
    now: c,
    prev:
      previous.criteria.find((p) => p.key === c.key) ??
      previous.criteria.find((p) => p.criterion.toLowerCase() === c.criterion.toLowerCase()),
  }))
  const criteria = pairs.map(({ now, prev }) => ({
    criterion: now.criterion,
    previous: prev ? prev.score : null,
    updated: now.score,
    delta: prev ? round1(now.score - prev.score) : null,
  }))

  if (isLegacy(previous.algorithm_version)) {
    const text =
      "The previous score used the legacy keyword rules; this score uses evidence-based scoring " +
      `v${next.algorithm_version}, so criterion points are not directly comparable.`
    return { previous_score: previous.score, updated_score: next.score, delta, reasons: [text], details: [{ kind: "algorithm", text }], config_effect: null, evidence_effect: null, criteria }
  }

  if (major(previous.algorithm_version) !== major(next.algorithm_version)) {
    details.push({ kind: "algorithm", text: `Scoring algorithm updated from v${previous.algorithm_version} to v${next.algorithm_version}.` })
  }

  const sameEvidence = previous.evidence_fingerprint !== null && previous.evidence_fingerprint === next.evidence_fingerprint
  const sameConfig = previous.config_version === next.config_version
  const span = 100 - next.baseline

  if (!sameConfig) {
    const changes: string[] = []
    if (previous.baseline !== next.baseline) changes.push(`baseline ${previous.baseline} → ${next.baseline}`)
    for (const { now, prev } of pairs) {
      const before = previous.weights?.[now.key]
      if (before !== undefined && before !== now.weight) changes.push(`${now.criterion} weight ${before}% → ${now.weight}%`)
      else if (before === undefined && prev && prev.max > 0 && previous.baseline === next.baseline && round1(prev.max) !== now.max) {
        changes.push(`${now.criterion} weight → ${now.weight}%`)
      }
    }
    details.push({
      kind: "configuration",
      text: `ICP configuration changed from "${previous.config_version}" to "${next.config_version}"${changes.length ? `: ${changes.join(", ")}` : ""}.`,
    })
  }

  let configEffect = next.baseline - previous.baseline
  for (const { now, prev } of pairs) {
    const before = prev?.score ?? 0
    const prevFraction = prev ? (prev.fraction ?? (prev.max ? prev.score / prev.max : 0)) : 0
    // Old fit under the new configuration's weight and baseline
    const counterfactual = round1((span * now.weight * prevFraction) / 100)
    let cfgPart = sameConfig ? 0 : counterfactual - before
    let evPart = now.score - (sameConfig ? before : counterfactual)
    if (sameEvidence) {
      // Same evidence: any change in fit comes from the criteria rules
      cfgPart += evPart
      evPart = 0
    }
    configEffect += cfgPart

    if (Math.abs(cfgPart) >= 0.05) {
      const causes: string[] = []
      const wBefore = previous.weights?.[now.key]
      if (wBefore !== undefined && wBefore !== now.weight) causes.push(`weight ${wBefore}% → ${now.weight}%`)
      if (prev && prev.status !== now.status && sameEvidence) causes.push(`criteria rules: ${prev.status.replace(/_/g, " ")} → ${now.status.replace(/_/g, " ")}`)
      else if (sameEvidence && Math.abs(now.fraction - prevFraction) > 0.0005) causes.push(`criteria rules: fit ${Math.round(prevFraction * 100)}% → ${Math.round(now.fraction * 100)}%`)
      if (causes.length === 0 && previous.baseline !== next.baseline) causes.push("rescaled by the baseline")
      details.push({
        kind: "configuration",
        text: `${now.criterion} ${fmtDelta(cfgPart)}${causes.length ? `: ${causes.join("; ")}` : ""}.`,
      })
    }
    if (Math.abs(evPart) >= 0.05 || (!sameEvidence && prev && prev.status !== now.status && sameConfig)) {
      const prevKeys = new Set((prev?.evidence ?? []).map(evidenceKey))
      const nowKeys = new Set(now.evidence.map(evidenceKey))
      const added = now.evidence.filter((e) => !prevKeys.has(evidenceKey(e)))
      const removed = (prev?.evidence ?? []).filter((e) => !nowKeys.has(evidenceKey(e)))
      const parts: string[] = []
      if (added.length) parts.push(`new evidence: ${added.map((e) => `"${e.text}"${e.source ? ` (${e.source})` : ""}`).join("; ")}`)
      if (removed.length) parts.push(`evidence no longer found: ${removed.map((e) => `"${e.text}"`).join("; ")}`)
      if (prev && prev.status !== now.status) parts.push(`status ${prev.status.replace(/_/g, " ")} → ${now.status.replace(/_/g, " ")}`)
      if (parts.length === 0) parts.push("same evidence items, re-assessed")
      const range = sameConfig ? ` (${round1(before)} → ${now.score})` : ""
      details.push({ kind: "evidence", text: `${now.criterion} ${fmtDelta(evPart)}${range}: ${parts.join("; ")}.` })
    }
  }

  if (previous.baseline !== next.baseline) {
    details.push({
      kind: "configuration",
      text: `Baseline ${fmtDelta(next.baseline - previous.baseline)}: every company now starts at ${next.baseline}, and criterion points scale to the remaining ${100 - next.baseline}.`,
    })
  }

  if (details.length === 0) {
    details.push({
      kind: "unchanged",
      text: sameEvidence
        ? "Evidence and configuration unchanged; the score is identical."
        : "The research wording changed, but the scored evidence did not move any criterion.",
    })
  }

  return {
    previous_score: previous.score,
    updated_score: next.score,
    delta,
    reasons: details.map((d) => d.text),
    details,
    ...splitEffects(delta, sameConfig, sameEvidence, configEffect),
    criteria,
  }
}

/**
 * Reconciles the attributed effects with the actual (rounded) score change,
 * so "configuration +x" and "evidence +y" always add up to the delta shown:
 * the configuration's share is rounded, and evidence takes the remainder.
 */
function splitEffects(
  delta: number | null,
  sameConfig: boolean,
  sameEvidence: boolean,
  configEffect: number,
): { config_effect: number | null; evidence_effect: number | null } {
  if (delta === null) return { config_effect: null, evidence_effect: null }
  if (sameConfig) return { config_effect: 0, evidence_effect: delta }
  if (sameEvidence) return { config_effect: delta, evidence_effect: 0 }
  const config = Math.round(configEffect)
  return { config_effect: config, evidence_effect: round1(delta - config) }
}

/**
 * Score evidence, stamp run metadata and compare with the previous score.
 * The single entry point for fresh research, cached research,
 * recalculation and the ICP Studio preview.
 */
export function evaluate(
  evidence: IcpEvidence,
  options: {
    config?: IcpConfig
    config_version_id?: number | null
    snapshot_id: string | null
    calculated_at: string | null
    previous?: ScoreSummary | null
  },
): IcpScoreResult {
  const result = scoreCompany(evidence, options.config ?? DEFAULT_ICP_CONFIG)
  result.snapshot_id = options.snapshot_id
  result.config_version_id = options.config_version_id ?? null
  result.calculated_at = options.calculated_at
  const previous = options.previous ?? null
  result.previous = previous
  result.change = compareScores(previous, result)
  return result
}
