import type {
  AccountBrief,
  CompanyResearchRecord,
  ResearchRequest,
  ResearchRunResult,
} from "@/types/research"

/**
 * The contract every backend implementation must satisfy.
 * Pages and hooks depend on this interface — never on a concrete client —
 * so swapping mock data for n8n/Postgres is a one-line change in `index.ts`.
 */
export interface ResearchApi {
  /** All researched companies, newest first. */
  listCompanies(): Promise<CompanyResearchRecord[]>

  /** A single company by its unique domain, or null if never researched. */
  getCompany(domain: string): Promise<CompanyResearchRecord | null>

  /** Trigger the n8n research workflow for a company name or domain. */
  runResearch(request: ResearchRequest): Promise<ResearchRunResult>

  /** Account briefs derived from validated research records. */
  listAccountBriefs(): Promise<AccountBrief[]>
}
