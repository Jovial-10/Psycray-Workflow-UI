import type { z } from "zod"
import {
  companyListSchema,
  icpConfigStateSchema,
  publishResponseSchema,
  rescoreAllSchema,
  scoreHistorySchema,
  researchJobListSchema,
  rescoreResponseSchema,
  researchJobSchema,
  startResearchResponseSchema,
} from "./schemas"
import { ApiError, type ResearchApi } from "./types"

/**
 * Talks to `/api/*` on the same origin. A reverse proxy (Vite in development,
 * nginx in production) forwards these calls to the n8n webhooks and adds the
 * secret header, so no credentials ever reach the browser.
 */
const API_BASE = "/api"

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    })
  } catch {
    throw new ApiError("Could not reach the research service. Check your connection.", 0)
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `The research service returned an error (HTTP ${response.status}).`
    const details =
      body && typeof body === "object" && "details" in body && Array.isArray(body.details)
        ? body.details.filter((d): d is string => typeof d === "string")
        : []
    throw new ApiError(message, response.status, details)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.error("Unexpected API response", path, parsed.error.issues, body)
    throw new ApiError("The research service returned an unexpected response.", response.status)
  }
  return parsed.data
}

export const httpResearchApi: ResearchApi = {
  startResearch({ input, refresh = false }) {
    return request("/research", startResearchResponseSchema, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, refresh }),
    })
  },

  getResearchJob(jobId) {
    return request(`/research/status?id=${encodeURIComponent(jobId)}`, researchJobSchema)
  },

  async listCompanies() {
    const { records } = await request("/companies", companyListSchema)
    return { records, source: "live" as const }
  },

  async listResearchJobs() {
    const { jobs } = await request("/research/jobs", researchJobListSchema)
    return { jobs, source: "live" as const }
  },

  getIcpConfig() {
    return request("/icp/config", icpConfigStateSchema)
  },

  async publishIcpConfig({ config, baseVersionId, note, publishedBy }) {
    const { version } = await request("/icp/config", publishResponseSchema, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, base_version_id: baseVersionId, note, published_by: publishedBy }),
    })
    return version
  },

  rescoreAll() {
    return request("/icp/rescore", rescoreAllSchema, { method: "POST" })
  },

  async getScoreHistory(domain) {
    const { entries } = await request(`/icp/history?domain=${encodeURIComponent(domain)}`, scoreHistorySchema)
    return entries
  },

  recalculateScore(domain) {
    return request("/research/rescore", rescoreResponseSchema, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    })
  },
}
