import type { CompanyResearchRecord, IcpTier, ResearchJobStatus, ResearchJobSummary } from "@/types/research"

/** "Recently researched" window (user decision: last 7 days). */
export const RECENT_DAYS = 7
const DAY = 24 * 60 * 60 * 1000

export interface OverviewMetrics {
  /** Companies with validated research. */
  researched: number
  /** Domains the workflow could not reach (attempted, not researched). */
  unreachable: number
  highFit: number
  /** High-fit share of researched companies, 0–1. */
  highFitShare: number
  /** Mean ICP score of scored companies, or null when none are scored. */
  averageScore: number | null
  scored: number
  /** Researched within RECENT_DAYS. */
  recent: number
}

const isValidated = (r: CompanyResearchRecord) => r.status === "validated"
const newestFirst = (a: CompanyResearchRecord, b: CompanyResearchRecord) =>
  b.updated_at.localeCompare(a.updated_at)

/** Every Overview number, derived from the records (never hardcoded). */
export function summarize(records: CompanyResearchRecord[], now = Date.now()): OverviewMetrics {
  const researched = records.filter(isValidated)
  const scores = researched.map((r) => r.icp_score).filter((s): s is number => s !== null)
  const highFit = researched.filter((r) => r.icp_tier === "High Fit").length

  return {
    researched: researched.length,
    unreachable: records.length - researched.length,
    highFit,
    highFitShare: researched.length ? highFit / researched.length : 0,
    averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    scored: scores.length,
    recent: researched.filter((r) => now - Date.parse(r.updated_at) <= RECENT_DAYS * DAY).length,
  }
}

export interface CompanyRow {
  domain: string
  name: string
  industry: string | null
  score: number | null
  tier: IcpTier | null
  researchedAt: string
}

/** Validated companies, newest first, flattened for the table. */
export function recentCompanies(records: CompanyResearchRecord[], limit = 8): CompanyRow[] {
  return records
    .filter(isValidated)
    .sort(newestFirst)
    .slice(0, limit)
    .map((r) => {
      const facts = r.company_facts && !("raw" in r.company_facts) ? r.company_facts : null
      return {
        domain: r.domain,
        name: r.synthesized_research?.company_name || facts?.company_name || r.domain,
        industry: facts?.target_industries[0] ?? null,
        score: r.icp_score,
        tier: r.icp_tier,
        researchedAt: r.updated_at,
      }
    })
}

export interface ActivityEvent {
  id: string
  status: ResearchJobStatus
  /** Company name when known, else the domain, else what the user typed. */
  subject: string
  /** True when `subject` is a domain (rendered in mono). */
  subjectIsDomain: boolean
  at: string
}

/**
 * Research requests and how they ended, newest first: fresh research, saved
 * results reopened, names with no website, unreachable sites and failures.
 * Complements the companies table instead of repeating it.
 */
export function researchActivity(
  jobs: ResearchJobSummary[],
  records: CompanyResearchRecord[],
  limit = 6,
): ActivityEvent[] {
  const names = new Map(
    records.filter(isValidated).map((r) => [r.domain, r.synthesized_research?.company_name || r.domain]),
  )
  return [...jobs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((j) => {
      const name = j.domain ? names.get(j.domain) : undefined
      return {
        id: j.job_id,
        status: j.status,
        subject: name ?? j.domain ?? j.input,
        subjectIsDomain: !name && !!j.domain,
        at: j.created_at,
      }
    })
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

/** "5 minutes ago", "yesterday", "3 weeks ago". */
export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.round((Date.parse(iso) - now) / 1000)
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return "just now"
}
