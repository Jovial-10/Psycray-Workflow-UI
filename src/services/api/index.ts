import { mockResearchApi } from "./mockClient"
import type { ResearchApi } from "./types"

/**
 * The single API instance the app uses.
 *
 * Phase 1 ships only the mock client. When the n8n/Postgres backend is
 * connected, add e.g. `httpClient.ts` implementing `ResearchApi` and select
 * it here (optionally via an env var such as `VITE_API_MODE`).
 */
export const api: ResearchApi = mockResearchApi

export type { ResearchApi }
