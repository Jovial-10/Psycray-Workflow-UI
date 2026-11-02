import { mockCompanies } from "@/mocks/companies"
import type { AccountBrief, CompanyResearchRecord } from "@/types/research"
import type { ResearchApi } from "./types"

/** Simulated network latency so loading states are exercised during development. */
const MOCK_LATENCY_MS = 300

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

function byNewest(a: CompanyResearchRecord, b: CompanyResearchRecord) {
  return b.updated_at.localeCompare(a.updated_at)
}

/** Strip protocol, `www.` and path — mirrors the workflow's "Normalize Input" node. */
function normalizeDomain(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase()
}

export const mockResearchApi: ResearchApi = {
  async listCompanies() {
    return delay([...mockCompanies].sort(byNewest))
  },

  async getCompany(domain) {
    const match = mockCompanies.find((c) => c.domain === normalizeDomain(domain))
    return delay(match ?? null)
  },

  async runResearch({ input }) {
    const domain = normalizeDomain(input)
    const match = mockCompanies.find((c) => c.domain === domain)

    if (match?.status === "validated") {
      return delay({
        status: "cached",
        domain: match.domain,
        cached_at: match.updated_at,
        company_facts: match.company_facts,
        research_signals: match.research_signals,
        synthesized_research: match.synthesized_research,
        sources: match.sources,
        icp_score: match.icp_score,
        icp_tier: match.icp_tier,
        account_brief: match.account_brief,
      })
    }

    return delay({
      status: "error",
      message: "Company website could not be reached or validated.",
      domain,
    })
  },

  async listAccountBriefs() {
    const briefs: AccountBrief[] = mockCompanies
      .filter((c) => c.status === "validated" && c.account_brief)
      .sort(byNewest)
      .map((c) => ({
        domain: c.domain,
        company_name: c.synthesized_research?.company_name ?? c.domain,
        icp_tier: c.icp_tier ?? "Needs Review",
        content: c.account_brief ?? "",
        generated_at: c.updated_at,
      }))
    return delay(briefs)
  },
}
