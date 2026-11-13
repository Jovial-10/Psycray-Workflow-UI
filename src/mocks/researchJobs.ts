import type { ResearchJobSummary } from "@/types/research"
import { ago } from "./time"

/**
 * Mock `research_jobs` log: every research request and how it ended,
 * including cached lookups, names that matched no website, and failures.
 * Domains refer to records in ./companies. Fictional, like all mock data.
 */
export const mockResearchJobs: ResearchJobSummary[] = [
  job(1, "cached", "LedgerLoop", "ledgerloop.example", 0.03),
  job(2, "completed", "cobaltridge.example", "cobaltridge.example", 0.08),
  job(3, "not_found", "Qwxzv Plorptex Holdings", null, 0.12, "No official website could be identified for this company."),
  job(4, "completed", "Brightline Fabrication", "brightline-fabrication.example", 0.2),
  job(5, "cached", "brightline-fabrication.example", "brightline-fabrication.example", 0.9),
  job(6, "completed", "ledgerloop.example", "ledgerloop.example", 1.1),
  job(7, "unreachable", "harborview-association.example", "harborview-association.example", 2.4, "Company website could not be reached or returned an error."),
  job(8, "failed", "northgate-logistics.example", null, 3.25, "Research step failed: Synthesize Intelligence & Evidence. Rate limit reached."),
  job(9, "completed", "northgate-logistics.example", "northgate-logistics.example", 3.2),
]

function job(
  id: number,
  status: ResearchJobSummary["status"],
  input: string,
  domain: string | null,
  daysAgo: number,
  error: string | null = null,
): ResearchJobSummary {
  return { job_id: `mock-job-${id}`, status, input, domain, error, created_at: ago(daysAgo) }
}
