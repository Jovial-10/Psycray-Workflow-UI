import type { CompanyResearchRecord, IcpTier } from "@/types/research"

/** One saved company, flattened for tables. */
export interface CompanyRow {
  domain: string
  name: string
  industry: string | null
  score: number | null
  tier: IcpTier | null
  researchedAt: string
  /** False when the workflow could not reach the website. */
  reachable: boolean
}

export function toCompanyRow(r: CompanyResearchRecord): CompanyRow {
  const facts = r.company_facts && !("raw" in r.company_facts) ? r.company_facts : null
  return {
    domain: r.domain,
    name: r.synthesized_research?.company_name || facts?.company_name || r.domain,
    // The company's own industry, not the industries it sells to
    industry: facts?.industry ?? null,
    score: r.icp_score,
    tier: r.icp_tier,
    researchedAt: r.updated_at,
    reachable: r.status === "validated",
  }
}

/** Fit-tier filter values, plus "unreachable" for domains that failed. */
export type TierFilter = "all" | IcpTier | "unreachable"
export const TIER_FILTERS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "High Fit", label: "High" },
  { value: "Moderate Fit", label: "Moderate" },
  { value: "Low Fit", label: "Low" },
  { value: "Needs Review", label: "Needs review" },
  { value: "unreachable", label: "Unreachable" },
]

export type CompanySort = "recent" | "score" | "name"
export const COMPANY_SORTS: { value: CompanySort; label: string }[] = [
  { value: "recent", label: "Last researched" },
  { value: "score", label: "ICP score" },
  { value: "name", label: "Name" },
]

export function matchesTier(row: CompanyRow, tier: TierFilter) {
  if (tier === "all") return true
  if (tier === "unreachable") return !row.reachable
  return row.reachable && row.tier === tier
}

/** Case-insensitive match on company name or domain. */
export function matchesQuery(row: CompanyRow, query: string) {
  const q = query.trim().toLowerCase()
  return !q || row.name.toLowerCase().includes(q) || row.domain.includes(q)
}

export function sortCompanies(rows: CompanyRow[], sort: CompanySort) {
  const byRecent = (a: CompanyRow, b: CompanyRow) => b.researchedAt.localeCompare(a.researchedAt)
  return [...rows].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    // Highest score first; unscored and unreachable last, newest first among ties
    if (sort === "score") return (b.score ?? -1) - (a.score ?? -1) || byRecent(a, b)
    return byRecent(a, b)
  })
}

/** Where a saved company's research lives. */
export const companyPath = (domain: string) => `/companies/${encodeURIComponent(domain)}`

/** Re-run research for a domain, skipping the 30-day cache. */
export const retryPath = (domain: string) => `/research?q=${encodeURIComponent(domain)}&refresh=1`
