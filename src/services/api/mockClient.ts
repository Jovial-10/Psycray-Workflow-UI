import { mockCompanies } from "@/mocks/companies"
import { mockResearchJobs } from "@/mocks/researchJobs"
import type { ResearchJob, ResearchJobStatus } from "@/types/research"
import { ApiError, type ResearchApi } from "./types"

/** Simulated network latency so loading states are exercised during development. */
const MOCK_LATENCY_MS = 300
/** How long a mock job stays "running" before it finishes. */
const MOCK_RUN_MS = 4000

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
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

const jobs = new Map<string, { input: string; refresh: boolean; startedAt: number }>()

/**
 * Outcome rules for mock inputs:
 * - a mock domain or company name → cached (or completed when refreshed)
 * - anything containing "unreachable" → unreachable
 * - anything else → not_found
 */
function finish(input: string, refresh: boolean) {
  const key = normalizeDomain(input)
  const match = mockCompanies.find(
    (c) =>
      c.status === "validated" &&
      (c.domain === key || c.synthesized_research?.company_name.toLowerCase() === key),
  )
  if (match) {
    return { status: (refresh ? "completed" : "cached") as ResearchJobStatus, domain: match.domain, record: match }
  }
  if (key.includes("unreachable")) {
    return { status: "unreachable" as const, domain: key, record: null }
  }
  return { status: "not_found" as const, domain: null, record: null }
}

/**
 * VITE_MOCK_SCENARIO=empty serves no companies, for checking empty states
 * during development.
 */
const emptyScenario = import.meta.env.VITE_MOCK_SCENARIO === "empty"

const ERRORS: Partial<Record<ResearchJobStatus, string>> = {
  unreachable: "Company website could not be reached or returned an error.",
  not_found: "No official website could be identified for this company.",
}

export const mockResearchApi: ResearchApi = {
  async listCompanies() {
    const records = emptyScenario
      ? []
      : [...mockCompanies].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    return delay({ records, source: "sample" as const })
  },

  async listResearchJobs() {
    const jobs = emptyScenario
      ? []
      : [...mockResearchJobs].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return delay({ jobs, source: "sample" as const })
  },

  async startResearch({ input, refresh = false }) {
    const job_id = crypto.randomUUID()
    jobs.set(job_id, { input, refresh, startedAt: Date.now() })
    return delay({ job_id, duplicate: false })
  },

  async getResearchJob(jobId) {
    const job = jobs.get(jobId)
    if (!job) throw new ApiError("Research job not found.", 404)

    const created_at = new Date(job.startedAt).toISOString()
    const base = { job_id: jobId, input: job.input, created_at }

    if (Date.now() - job.startedAt < MOCK_RUN_MS) {
      return delay<ResearchJob>({
        ...base, status: "running", domain: null, error: null, updated_at: created_at, record: null,
      })
    }

    const outcome = finish(job.input, job.refresh)
    return delay<ResearchJob>({
      ...base,
      ...outcome,
      error: ERRORS[outcome.status] ?? null,
      updated_at: new Date().toISOString(),
    })
  },
}
