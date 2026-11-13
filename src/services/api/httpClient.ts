import type { z } from "zod"
import { researchJobSchema, startResearchResponseSchema } from "./schemas"
import { mockResearchApi } from "./mockClient"
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
    throw new ApiError(message, response.status)
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

  // No history endpoint on n8n yet (Phase 2.1b). Until it exists, serve the
  // labelled sample set; the response's `source: "sample"` drives the notice.
  listCompanies() {
    return mockResearchApi.listCompanies()
  },

  // Same for the job log until a GET endpoint over research_jobs exists.
  listResearchJobs() {
    return mockResearchApi.listResearchJobs()
  },
}
