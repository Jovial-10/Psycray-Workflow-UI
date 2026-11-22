import {
  DEFAULT_ICP_CONFIG,
  ICP_ALGORITHM_VERSION,
  describeConfigChanges,
  evaluate,
  normalizeConfig,
  summarizeStored,
  supplementEvidence,
  validateConfig,
  type IcpConfig,
} from "@/lib/scoring/icpEngine"
import { buildProposal, checkInstruction, parseAssistantOutput } from "@/lib/scoring/icpAssistant"
import { mockCompanies } from "@/mocks/companies"
import { sampleInterpret } from "@/mocks/sampleInterpreter"
import { ago } from "@/mocks/time"
import type { CompanyResearchRecord, IcpConfigVersion, ScoreHistoryEntry } from "@/types/research"
import { parseStoredBreakdown } from "./schemas"
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

/* ICP configuration, kept in memory for the session (mirrors icp_config_versions) */
const mockVersions: IcpConfigVersion[] = [
  {
    id: 1,
    version: 1,
    label: DEFAULT_ICP_CONFIG.version,
    config: DEFAULT_ICP_CONFIG,
    note: "Initial configuration: weights 20/15/30/25/10, baseline 0, no hard requirements",
    change_summary: [],
    published_by: "system",
    published_at: ago(21),
    archived_at: null,
  },
]
let activeVersionId = 1
const mockHistory = new Map<string, ScoreHistoryEntry[]>()
const active = () => mockVersions.find((v) => v.id === activeVersionId)!

/** Same rules as the n8n rescoring nodes: saved evidence only, active version. */
function rescoreRecord(record: CompanyResearchRecord, config: IcpConfig, configId: number) {
  const saved = record.synthesized_research?.icp_evidence
  if (!saved) return null
  const previous = summarizeStored(
    { ...record.icp_scoring, score: record.icp_score, criteria: record.icp_breakdown },
    record.icp_score,
    record.icp_tier,
  )
  const result = evaluate(supplementEvidence(saved, record.company_facts), {
    config,
    config_version_id: configId,
    snapshot_id: record.icp_scoring?.snapshot_id ?? null,
    calculated_at: new Date().toISOString(),
    previous,
  })
  const { criteria, scoring } = parseStoredBreakdown(result)
  const updated: CompanyResearchRecord = { ...record, icp_score: result.score, icp_tier: result.tier, icp_breakdown: criteria, icp_scoring: scoring }
  const entries = mockHistory.get(record.domain) ?? []
  entries.unshift({
    id: Date.now() + entries.length,
    trigger: "recalculate",
    score: result.score,
    tier: result.tier,
    algorithm_version: result.algorithm_version,
    config_version: result.config_version,
    config_version_id: configId,
    snapshot_id: result.snapshot_id,
    calculated_at: result.calculated_at!,
    change: result.change,
  })
  mockHistory.set(record.domain, entries)
  return { updated, previous: previous?.score ?? null }
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

  /** Same engine and rules as the n8n "Recalculate Score" node. */
  async recalculateScore(domain) {
    const index = mockCompanies.findIndex((c) => c.domain === domain && c.status === "validated")
    if (index === -1) throw new ApiError("No saved research for this domain.", 404)
    const out = rescoreRecord(mockCompanies[index], active().config, activeVersionId)
    if (!out) {
      throw new ApiError("This research predates evidence-based scoring. Refresh it once to collect scoring evidence.", 409)
    }
    mockCompanies[index] = out.updated
    return delay({ record: out.updated })
  },

  async getIcpConfig() {
    return delay({
      profile: { slug: "psycray-default", name: "Psycray default ICP", active_version_id: activeVersionId },
      versions: [...mockVersions].sort((a, b) => b.version - a.version),
    })
  },

  async publishIcpConfig({ config, baseVersionId, note, publishedBy }) {
    if (baseVersionId !== activeVersionId) {
      throw new ApiError("Someone published a newer version while you were editing. Reload to see it, then reapply your changes.", 409)
    }
    const version = Math.max(...mockVersions.map((v) => v.version)) + 1
    const next = normalizeConfig({ ...config, version: `psycray-default-v${version}` })
    const errors = validateConfig(next)
    if (errors.length) throw new ApiError("The configuration is not valid.", 400, errors)
    const changes = describeConfigChanges(active().config, next)
    if (changes.length === 0) throw new ApiError("Nothing changed: this matches the published version.", 400)
    const row: IcpConfigVersion = {
      id: version,
      version,
      label: next.version,
      config: next,
      note: note.trim() || null,
      change_summary: changes,
      published_by: publishedBy.trim().slice(0, 60) || "Psycray team",
      published_at: new Date().toISOString(),
      archived_at: null,
    }
    mockVersions.push(row)
    activeVersionId = row.id
    return delay(row)
  },

  async rescoreAll() {
    const { config } = active()
    const summary = { config_version: config.version, rescored: 0, unchanged: 0, up_to_date: 0, needs_refresh: [] as string[], changes: [] as { domain: string; previous: number | null; updated: number }[] }
    mockCompanies.forEach((record, i) => {
      if (record.status !== "validated") return
      if (record.icp_scoring?.config_version === config.version && record.icp_scoring.algorithm_version === ICP_ALGORITHM_VERSION) {
        summary.up_to_date++
        return
      }
      const out = rescoreRecord(record, config, activeVersionId)
      if (!out) return void summary.needs_refresh.push(record.domain)
      mockCompanies[i] = out.updated
      summary.rescored++
      if (out.previous === out.updated.icp_score) summary.unchanged++
      else summary.changes.push({ domain: record.domain, previous: out.previous, updated: out.updated.icp_score! })
    })
    return delay(summary)
  },

  /** Same proposal code as the n8n "Build Proposal" node; a rule-based stand-in replaces the model. */
  async interpretIcp(instruction, draft) {
    const problem = checkInstruction(instruction)
    if (problem) throw new ApiError(problem, 400)
    const parsed = parseAssistantOutput(sampleInterpret(instruction))
    if (!parsed.ok) throw new ApiError(parsed.error, 502)
    return delay(buildProposal(draft, parsed.output))
  },

  async archiveIcpVersion(versionId, archived) {
    const v = mockVersions.find((x) => x.id === versionId)
    if (!v) throw new ApiError("That version does not exist.", 404)
    if (archived && v.version === 1) throw new ApiError("The original version (version 1) cannot be archived.", 400)
    if (archived && v.id === activeVersionId) throw new ApiError("The active version cannot be archived. Publish another version first.", 400)
    v.archived_at = archived ? new Date().toISOString() : null
    await delay(null)
  },

  async getScoreHistory(domain) {
    return delay(mockHistory.get(domain) ?? [])
  },
}
