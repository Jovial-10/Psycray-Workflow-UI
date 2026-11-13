import type {
  CompanyList,
  ResearchJob,
  ResearchJobList,
  ResearchRequest,
  StartResearchResponse,
} from "@/types/research"

/**
 * The contract every backend implementation must satisfy.
 * Pages and hooks depend on this interface — never on a concrete client —
 * so swapping mock data for n8n is a one-line change in `index.ts`.
 */
export interface ResearchApi {
  /** Start the n8n research workflow for a company name or domain. */
  startResearch(request: ResearchRequest): Promise<StartResearchResponse>

  /** Current state of a research job, including the result once finished. */
  getResearchJob(jobId: string): Promise<ResearchJob>

  /** Researched companies (validated and unreachable), newest first. */
  listCompanies(): Promise<CompanyList>

  /** Recent research requests and their outcomes, newest first. */
  listResearchJobs(): Promise<ResearchJobList>
}

/** A failed API call, with a message that is safe to show to users. */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}
