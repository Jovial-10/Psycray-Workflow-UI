/**
 * Psycray ICP scoring engine: the single source of truth for ICP scores.
 *
 * The same file runs in three places:
 *   - n8n Code nodes ("ICP Scoring Logic", "Recalculate Score"), type-stripped
 *     and embedded by `npm run sync:n8n` (scripts/sync-n8n-scoring.ts)
 *   - the regression tests (tests/scoring)
 *   - the frontend's mock data
 *
 * Rules:
 *   - The LLM only CLASSIFIES evidence into fixed categories, each with a
 *     quote and a source. It never produces numbers that reach the score.
 *   - `normalizeEvidence` turns that raw classification into canonical
 *     evidence (validated enums, verified sources, stable order).
 *   - `scoreCompany` is a pure function of (evidence, config). Same input,
 *     same output, every time. No clock, no randomness, no I/O.
 *   - Unknown is not failure: a criterion without evidence is "unknown",
 *     earns 0 points and is listed under missing information. The result
 *     reports how much of the weight was actually assessed (coverage).
 *
 * Constraints (so it can be pasted into an n8n Code node):
 *   - no imports, no globals beyond plain JS built-ins (no URL, no crypto)
 *   - only erasable TypeScript syntax
 */

export const ICP_ALGORITHM_VERSION = "2.0.0"
/** Version label for scores produced by the original keyword rules. */
export const LEGACY_ALGORITHM_VERSION = "1-keyword"

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
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

export interface IcpConfig {
  /** Bump whenever any value below changes; stored with every score. */
  version: string
  /** Percent of the 100-point score per criterion. Must sum to 100. */
  weights: Record<CriterionKey, number>
  /** Share of the Industry Fit weight earned per category (missing = 0). */
  industryFit: Partial<Record<IndustryCategory, number>>
  /** Employee-count bands, first match wins. `max: null` = no upper bound. */
  sizeBands: { min: number; max: number | null; fraction: number; label: string }[]
  /** Share of the Digital Opportunity weight for stated vs inferred needs. */
  digitalOpportunity: { stated: number; inferred: number }
  /** Strength of one verified signal of each type. */
  growthSignalStrength: Record<GrowthSignalType, number>
  /** Signals older than this (relative to the research date) don't count. */
  growthWindowMonths: number
  /** Undated signals count at this share of their strength. */
  undatedSignalFactor: number
  /** Share of the Project Ownership weight for stated vs inferred owners. */
  projectOwnership: { stated: number; inferred: number }
  tiers: { high: number; moderate: number }
  /** Below this assessed share of weight (0–100), the tier is "Needs Review". */
  minCoverageForTier: number
}

/**
 * Psycray's current model (weights from the sales team, 2026-11-21).
 * Sweet spot from the account-brief prompt: U.S. B2B organisations with
 * 10–250 employees (10–50 preferred): SaaS, manufacturers and industrial
 * suppliers, associations, agencies.
 */
export const DEFAULT_ICP_CONFIG: IcpConfig = {
  version: "psycray-default-2026-11-21",
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
    { min: 10, max: 50, fraction: 1, label: "10–50 employees (sweet spot)" },
    { min: 51, max: 250, fraction: 0.7, label: "51–250 employees (target range)" },
    { min: 251, max: 1000, fraction: 0.25, label: "251–1,000 employees (above target)" },
    { min: 1, max: 9, fraction: 0.25, label: "under 10 employees (below target)" },
    { min: 1001, max: null, fraction: 0, label: "over 1,000 employees (enterprise)" },
  ],
  digitalOpportunity: { stated: 1, inferred: 0.5 },
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
  projectOwnership: { stated: 1, inferred: 0.5 },
  tiers: { high: 80, moderate: 55 },
  minCoverageForTier: 50,
}

export const CRITERIA: { key: CriterionKey; label: string }[] = [
  { key: "industry_fit", label: "Industry Fit" },
  { key: "company_size", label: "Company Size" },
  { key: "digital_opportunity", label: "Digital Opportunity" },
  { key: "growth_signals", label: "Growth Signals" },
  { key: "project_ownership", label: "Project Ownership" },
]

const INDUSTRY_CATEGORIES: IndustryCategory[] = [
  "saas", "software", "manufacturing", "industrial_supplier", "association", "agency", "logistics",
  "professional_services", "healthcare", "financial_services", "retail_consumer", "education",
  "government", "nonprofit", "other",
]
const DIGITAL_NEED_TYPES: DigitalNeedType[] = [
  "workflow_automation", "system_integration", "customer_portal", "custom_software", "legacy_modernization", "data_reporting",
]
const GROWTH_SIGNAL_TYPES: GrowthSignalType[] = ["hiring", "funding", "expansion", "acquisition", "partnership", "product_launch"]
const OWNER_TYPES: OwnerType[] = ["technical_leader", "product_leader", "operations_leader", "in_house_engineering"]

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
  unknowns: string[]
}

export interface NormalizeContext {
  domain: string
  researched_at: string
  /** External search results the research retrieved (the company's own site is always trusted). */
  external_urls: string[]
  /** Unknowns listed by the synthesis step, kept as missing information. */
  unknowns?: string[]
}

/* ------------------------------------------------------------------ */
/* Result                                                              */
/* ------------------------------------------------------------------ */

export type CriterionStatus = "met" | "partial" | "not_met" | "unknown" | "conflicting"

export interface CriterionResult {
  key: CriterionKey
  criterion: string
  /** Points earned, one decimal. */
  score: number
  /** Points available (= the configured weight). */
  max: number
  weight: number
  /** Share of the weight earned, 0–1. */
  fraction: number
  status: CriterionStatus
  reason: string
  evidence: EvidenceRef[]
}

export interface ScoreChange {
  previous_score: number | null
  updated_score: number | null
  delta: number | null
  /** Built from criterion and evidence differences only. */
  reasons: string[]
  criteria: { criterion: string; previous: number | null; updated: number; delta: number | null }[]
}

export interface ScoreSummary {
  score: number | null
  tier: string | null
  algorithm_version: string
  config_version: string | null
  snapshot_id: string | null
  evidence_fingerprint: string | null
  calculated_at: string | null
  criteria: { key?: CriterionKey; criterion: string; score: number; max: number; status: string; evidence?: EvidenceRef[] }[]
}

export interface IcpScoreResult {
  score: number
  tier: "High Fit" | "Moderate Fit" | "Low Fit" | "Needs Review"
  criteria: CriterionResult[]
  /** Share of the total weight that had evidence (0–100). */
  coverage: number
  /** Score if every unknown criterion turned out fully met. */
  max_possible: number
  missing: string[]
  algorithm_version: string
  config_version: string
  weights: Record<CriterionKey, number>
  evidence_fingerprint: string
  /** Set by the caller (research run / recalculation), not by the engine. */
  snapshot_id: string | null
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

function toCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value)
  if (typeof value === "string") {
    const n = Number(value.replace(/[,\s+]/g, ""))
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
  const category = oneOf(ind.category, INDUSTRY_CATEGORIES)
  const industry = category
    ? { category, label: clean(ind.label, 120), evidence: ref(ind.evidence, ind.source, ctx) }
    : null

  const employee_counts = uniqueBy(
    asArray(r.employee_count_evidence)
      .map((item) => {
        const e = obj(item)
        let min = toCount(e.min ?? e.value)
        let max = toCount(e.max ?? e.value)
        if (min === null && max !== null) min = max
        if (max === null && min !== null) max = min
        if (min === null || max === null || min < 1) return null
        if (max < min) [min, max] = [max, min]
        return { min, max, evidence: ref(e.evidence, e.source, ctx) }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(byKey((x) => `${String(x.min).padStart(9, "0")}|${String(x.max).padStart(9, "0")}|${x.evidence.source}`)),
    (x) => `${x.min}|${x.max}|${x.evidence.source}`,
  )

  const digital_needs = uniqueBy(
    asArray(r.digital_needs)
      .map((item) => {
        const e = obj(item)
        const type = oneOf(e.type, DIGITAL_NEED_TYPES)
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
        const type = oneOf(e.type, GROWTH_SIGNAL_TYPES)
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
        const type = oneOf(e.type, OWNER_TYPES)
        const basis = oneOf(e.basis, ["stated", "inferred"] as Basis[]) ?? "inferred"
        return type ? { type, basis, evidence: ref(e.evidence, e.source, ctx) } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort(byKey((x) => `${x.type}|${x.basis}|${x.evidence.source}|${x.evidence.text}`)),
    (x) => `${x.type}|${x.basis}|${x.evidence.source}`,
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
    hq_country: clean(r.hq_country, 60) || null,
    unknowns,
  }
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

interface Assessment {
  fraction: number
  status: CriterionStatus
  reason: string
  evidence: EvidenceRef[]
}

const NEED_LABEL: Record<DigitalNeedType, string> = {
  workflow_automation: "workflow automation",
  system_integration: "system integration",
  customer_portal: "customer or partner portal",
  custom_software: "custom software",
  legacy_modernization: "legacy system modernisation",
  data_reporting: "data and reporting",
}

const OWNER_LABEL: Record<OwnerType, string> = {
  technical_leader: "technical leader",
  product_leader: "product leader",
  operations_leader: "operations leader",
  in_house_engineering: "in-house engineering or IT team",
}

function assessIndustry(ev: IcpEvidence, cfg: IcpConfig): Assessment {
  if (!ev.industry) {
    return { fraction: 0, status: "unknown", reason: "The company's own industry could not be determined", evidence: [] }
  }
  const fraction = cfg.industryFit[ev.industry.category] ?? 0
  const name = ev.industry.label || ev.industry.category.replace(/_/g, " ")
  const fit = fraction >= 1 ? "core vertical" : fraction > 0 ? "adjacent vertical" : "outside target verticals"
  return {
    fraction,
    status: fraction >= 1 ? "met" : fraction > 0 ? "partial" : "not_met",
    reason: `${name}: ${fit}`,
    evidence: [ev.industry.evidence],
  }
}

function bandFor(count: number, cfg: IcpConfig) {
  return cfg.sizeBands.find((b) => count >= b.min && (b.max === null || count <= b.max)) ?? null
}

function assessSize(ev: IcpEvidence, cfg: IcpConfig): Assessment {
  if (ev.employee_counts.length === 0) {
    return { fraction: 0, status: "unknown", reason: "No employee count found", evidence: [] }
  }
  // Each report is a range; judge it by the band of both ends.
  const bands = ev.employee_counts.flatMap((c) => [bandFor(c.min, cfg), bandFor(c.max, cfg)])
  const labels = uniqueBy(bands.filter((b) => b !== null).map((b) => b!.label), (l) => l)
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
    reason: labels[0] ?? "Employee count outside every configured band",
    evidence,
  }
}

function assessDigital(ev: IcpEvidence, cfg: IcpConfig): Assessment {
  const usable = ev.digital_needs.filter((n) => n.basis === "inferred" || n.evidence.verified)
  if (usable.length === 0) {
    return {
      fraction: 0,
      status: "unknown",
      reason: "No workflow, integration, portal or custom-software need found in the sources reviewed",
      evidence: [],
    }
  }
  const stated = usable.filter((n) => n.basis === "stated")
  const chosen = stated.length > 0 ? stated : usable
  const fraction = stated.length > 0 ? cfg.digitalOpportunity.stated : cfg.digitalOpportunity.inferred
  const types = uniqueBy(chosen.map((n) => NEED_LABEL[n.type]), (t) => t)
  return {
    fraction,
    status: fraction >= 1 ? "met" : "partial",
    reason: `${stated.length > 0 ? "Stated" : "Inferred (not stated by a source)"} need: ${types.join(", ")}`,
    evidence: chosen.map((n) => n.evidence),
  }
}

function monthsBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / (1000 * 60 * 60 * 24 * 30.4375)
}

function assessGrowth(ev: IcpEvidence, cfg: IcpConfig): Assessment {
  const about = ev.growth_signals.filter((s) => s.about_target)
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
          : `No growth signal about this company was found${excluded > 0 ? ` (${excluded} about other companies or unverifiable, excluded)` : ""}`,
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
    status: fraction >= 1 ? "met" : "partial",
    reason: `Verified signals: ${picked.map((x) => x.signal.type.replace(/_/g, " ") + (x.signal.date ? ` (${x.signal.date})` : " (undated)")).join(", ")}`,
    evidence: picked.map((x) => x.signal.evidence),
  }
}

function assessOwnership(ev: IcpEvidence, cfg: IcpConfig): Assessment {
  const usable = ev.owners.filter((o) => o.basis === "inferred" || o.evidence.verified)
  if (usable.length === 0) {
    return { fraction: 0, status: "unknown", reason: "No one identified who would own a technology project", evidence: [] }
  }
  const stated = usable.filter((o) => o.basis === "stated")
  const chosen = stated.length > 0 ? stated : usable
  const fraction = stated.length > 0 ? cfg.projectOwnership.stated : cfg.projectOwnership.inferred
  return {
    fraction,
    status: fraction >= 1 ? "met" : "partial",
    reason: `${stated.length > 0 ? "Identified" : "Likely (inferred)"}: ${uniqueBy(chosen.map((o) => OWNER_LABEL[o.type]), (t) => t).join(", ")}`,
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

/** Pure: identical (evidence, config) always gives an identical result. */
export function scoreCompany(evidence: IcpEvidence, config: IcpConfig = DEFAULT_ICP_CONFIG): IcpScoreResult {
  const totalWeight = CRITERIA.reduce((sum, c) => sum + config.weights[c.key], 0)
  if (totalWeight !== 100) throw new Error(`ICP weights must sum to 100 (got ${totalWeight})`)

  const criteria: CriterionResult[] = CRITERIA.map(({ key, label }) => {
    const a = ASSESSORS[key](evidence, config)
    const weight = config.weights[key]
    const fraction = Math.max(0, Math.min(1, a.fraction))
    return {
      key,
      criterion: label,
      score: round1(weight * fraction),
      max: weight,
      weight,
      fraction: Math.round(fraction * 1000) / 1000,
      status: a.status,
      reason: a.reason,
      evidence: a.evidence,
    }
  })

  const score = Math.round(criteria.reduce((sum, c) => sum + c.score, 0))
  const unknownWeight = criteria.filter((c) => c.status === "unknown").reduce((sum, c) => sum + c.weight, 0)
  const coverage = 100 - unknownWeight
  const tier: IcpScoreResult["tier"] =
    coverage < config.minCoverageForTier
      ? "Needs Review"
      : score >= config.tiers.high
        ? "High Fit"
        : score >= config.tiers.moderate
          ? "Moderate Fit"
          : "Low Fit"

  const missing = [
    ...criteria.filter((c) => c.status === "unknown").map((c) => `${c.criterion}: ${c.reason}`),
    ...evidence.unknowns,
  ]

  return {
    score,
    tier,
    criteria,
    coverage,
    max_possible: Math.round(score + unknownWeight),
    missing,
    algorithm_version: ICP_ALGORITHM_VERSION,
    config_version: config.version,
    weights: { ...config.weights },
    evidence_fingerprint: fingerprint(evidence),
    snapshot_id: null,
    calculated_at: null,
    previous: null,
    change: null,
  }
}

/* ------------------------------------------------------------------ */
/* Comparison: previous score → new score                              */
/* ------------------------------------------------------------------ */

/**
 * Reduces any stored score (new engine or the legacy keyword rules) to the
 * fields needed for a comparison. Returns null when there is nothing to compare.
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
    snapshot_id: result.snapshot_id,
    evidence_fingerprint: result.evidence_fingerprint,
    calculated_at: result.calculated_at,
    criteria: result.criteria.map((c) => ({
      key: c.key,
      criterion: c.criterion,
      score: c.score,
      max: c.max,
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

/**
 * Explains a score change using only the recorded differences: versions,
 * evidence fingerprint, per-criterion points, statuses and evidence items.
 */
export function compareScores(previous: ScoreSummary | null, next: IcpScoreResult): ScoreChange | null {
  if (!previous) return null
  const reasons: string[] = []
  const legacy = previous.algorithm_version === LEGACY_ALGORITHM_VERSION

  if (legacy) {
    reasons.push(
      "The previous score used the legacy keyword rules; this score uses evidence-based scoring " +
        `v${next.algorithm_version}, so criterion points are not directly comparable.`,
    )
  } else {
    if (previous.algorithm_version !== next.algorithm_version) {
      reasons.push(`Scoring algorithm changed from v${previous.algorithm_version} to v${next.algorithm_version}.`)
    }
    if (previous.config_version !== next.config_version) {
      reasons.push(`ICP configuration changed from "${previous.config_version}" to "${next.config_version}".`)
    }
  }

  const criteria = next.criteria.map((c) => {
    const prev =
      previous.criteria.find((p) => p.key === c.key) ??
      previous.criteria.find((p) => p.criterion.toLowerCase() === c.criterion.toLowerCase())
    return { now: c, prev }
  })

  if (!legacy) {
    for (const { now, prev } of criteria) {
      const before = prev?.score ?? 0
      const delta = round1(now.score - before)
      if (delta === 0 && prev && prev.status === now.status) continue
      const prevKeys = new Set((prev?.evidence ?? []).map(evidenceKey))
      const nowKeys = new Set(now.evidence.map(evidenceKey))
      const added = now.evidence.filter((e) => !prevKeys.has(evidenceKey(e)))
      const removed = (prev?.evidence ?? []).filter((e) => !nowKeys.has(evidenceKey(e)))
      const parts: string[] = []
      if (added.length) parts.push(`new evidence: ${added.map((e) => `"${e.text}"${e.source ? ` (${e.source})` : ""}`).join("; ")}`)
      if (removed.length) parts.push(`evidence no longer found: ${removed.map((e) => `"${e.text}"`).join("; ")}`)
      if (prev && prev.status !== now.status) parts.push(`status ${prev.status.replace(/_/g, " ")} → ${now.status.replace(/_/g, " ")}`)
      if (parts.length === 0 && delta !== 0) parts.push("same evidence, different weighting")
      if (delta === 0 && parts.length === 0) continue
      reasons.push(`${now.criterion} ${fmtDelta(delta)} (${round1(before)} → ${now.score}): ${parts.join("; ")}.`)
    }
    if (reasons.length === 0) {
      reasons.push(
        previous.evidence_fingerprint === next.evidence_fingerprint
          ? "Evidence and configuration unchanged; the score is identical."
          : "The research wording changed, but the scored evidence did not move any criterion.",
      )
    }
  }

  const delta = previous.score === null ? null : round1(next.score - previous.score)
  return {
    previous_score: previous.score,
    updated_score: next.score,
    delta,
    reasons,
    criteria: criteria.map(({ now, prev }) => ({
      criterion: now.criterion,
      previous: prev ? prev.score : null,
      updated: now.score,
      delta: prev ? round1(now.score - prev.score) : null,
    })),
  }
}

/**
 * Score evidence, stamp run metadata and compare with the previous score.
 * The single entry point used by n8n for both fresh research and recalculation.
 */
export function evaluate(
  evidence: IcpEvidence,
  options: {
    config?: IcpConfig
    snapshot_id: string | null
    calculated_at: string
    previous?: ScoreSummary | null
  },
): IcpScoreResult {
  const result = scoreCompany(evidence, options.config ?? DEFAULT_ICP_CONFIG)
  result.snapshot_id = options.snapshot_id
  result.calculated_at = options.calculated_at
  const previous = options.previous ?? null
  result.previous = previous
  result.change = compareScores(previous, result)
  return result
}
