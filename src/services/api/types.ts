import type { IcpConfig } from "@/lib/scoring/icpEngine"
import type {
  CompanyList,
  IcpConfigState,
  IcpConfigVersion,
  RescoreAllSummary,
  ScoreHistoryEntry,
  RescoreResponse,
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

  /**
   * Re-score saved research with the current ICP configuration.
   * Uses the stored evidence only: no new research, no LLM calls.
   */
  recalculateScore(domain: string): Promise<RescoreResponse>

  /** Published ICP versions (newest first) and which one is active. */
  getIcpConfig(): Promise<IcpConfigState>

  /**
   * Publishes a new immutable ICP version and makes it active.
   * 409 when `baseVersionId` is no longer the active version.
   * `publishedBy` is optional attribution, not authentication.
   */
  publishIcpConfig(input: { config: IcpConfig; baseVersionId: number; note: string; publishedBy: string }): Promise<IcpConfigVersion>

  /** Rescores every saved company with the active version, from saved evidence. */
  rescoreAll(): Promise<RescoreAllSummary>

  /** A company's score history, newest first. */
  getScoreHistory(domain: string): Promise<ScoreHistoryEntry[]>
}

/** A failed API call, with a message that is safe to show to users. */
export class ApiError extends Error {
  readonly status: number
  /** Extra reasons from the server, e.g. every validation error. */
  readonly details: string[]

  constructor(message: string, status: number, details: string[] = []) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}
