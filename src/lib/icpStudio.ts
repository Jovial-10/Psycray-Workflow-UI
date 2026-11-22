import {
  canonicalJson,
  evaluate,
  supplementEvidence,
  toSummary,
  validateConfig,
  type IcpConfig,
  type IcpScoreResult,
} from "@/lib/scoring/icpEngine"
import type { CompanyResearchRecord } from "@/types/research"

/** Same settings, ignoring the version label. */
export function sameConfig(a: IcpConfig, b: IcpConfig): boolean {
  return canonicalJson({ ...a, version: "" }) === canonicalJson({ ...b, version: "" })
}

export function hasEvidence(record: CompanyResearchRecord): boolean {
  return record.status === "validated" && !!record.synthesized_research?.icp_evidence
}

export interface Preview {
  /** The company scored with the published version (same engine as the server). */
  published: IcpScoreResult
  /** The company scored with the draft; null while the draft is invalid. */
  draft: IcpScoreResult | null
}

/**
 * Scores a saved company's evidence with the published version and with the
 * draft. Same evidence on both sides, so every difference is configuration.
 * Runs in the browser with the shared engine; nothing is saved.
 */
export function previewCompany(
  record: CompanyResearchRecord,
  published: IcpConfig,
  publishedId: number,
  draft: IcpConfig,
): Preview | null {
  const saved = record.synthesized_research?.icp_evidence
  if (!saved) return null
  const evidence = supplementEvidence(saved, record.company_facts)
  const base = evaluate(evidence, { config: published, config_version_id: publishedId, snapshot_id: null, calculated_at: null })
  const draftResult =
    validateConfig(draft).length === 0
      ? evaluate(evidence, {
          config: { ...draft, version: "draft" },
          snapshot_id: null,
          calculated_at: null,
          previous: toSummary(base),
        })
      : null
  return { published: base, draft: draftResult }
}

export const pct = (fraction: number) => `${Math.round(fraction * 100)}%`
