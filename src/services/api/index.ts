import { httpResearchApi } from "./httpClient"
import { mockResearchApi } from "./mockClient"
import type { ResearchApi } from "./types"

/**
 * The single API instance the app uses.
 *
 * `VITE_API_MODE=mock` uses local mock data (no n8n needed).
 * Anything else, including unset, talks to the live n8n workflow via `/api`.
 */
export const apiMode = import.meta.env.VITE_API_MODE === "mock" ? "mock" : "live"

export const api: ResearchApi = apiMode === "mock" ? mockResearchApi : httpResearchApi

export { ApiError } from "./types"
export type { ResearchApi }
