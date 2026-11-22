/**
 * The code that actually runs in n8n: generated from the engine, executed
 * here with stubbed n8n globals.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import {
  AGENT_WORKFLOW,
  API_WORKFLOW,
  nodeCode,
  rescoreNodeCode,
  scoringNodeCode,
} from "../../scripts/n8n-scoring.ts"
import { normalizeEvidence, scoreCompany } from "./engine.ts"
import { BASECAMP_SEARCH_RESULTS, basecampClassification, basecampContext, basecampHiringSignal } from "./fixtures.ts"
import { modelOutput, runCodeNode } from "./n8nHarness.ts"

type Json = Record<string, any>

const synthesis = { company_name: "Basecamp", summary: "Project management software.", unknowns: ["Annual revenue", "Exact employee count"] }

function freshRun(opts: { classification?: unknown; previous?: Json; now?: string; exec?: string } = {}): Json {
  const loaded = {
    candidate_domain: "basecamp.com",
    cache_id: opts.previous ? 1 : null,
    prev_icp_score: opts.previous?.score ?? null,
    prev_icp_tier: opts.previous?.tier ?? null,
    prev_icp_breakdown: opts.previous ?? null,
  }
  const [out] = runCodeNode(nodeCode(AGENT_WORKFLOW, "ICP Scoring Logic")!, {
    nodes: {
      "Synthesize Intelligence & Evidence": [modelOutput("```json\n" + JSON.stringify(synthesis) + "\n```")],
      "Classify ICP Evidence": [modelOutput(opts.classification ?? basecampClassification)],
      "Load Fresh Research by Domain": [{ json: loaded }],
      "Find Growth Signals": BASECAMP_SEARCH_RESULTS.map((url) => ({ json: { url } })),
    },
    json: { formatted_exa_evidence: "…" },
    now: opts.now ?? basecampContext.researched_at,
    executionId: opts.exec ?? "40814",
  })
  return out.json
}

function rescore(row: Json, now = "2026-12-01T00:00:00.000Z"): Json {
  const [out] = runCodeNode(nodeCode(API_WORKFLOW, "Recalculate Score")!, { nodes: {}, input: [{ json: row }], now })
  return out.json
}

describe("generated n8n code", () => {
  it("the workflow files contain the current engine (run `npm run sync:n8n` if this fails)", () => {
    assert.equal(nodeCode(AGENT_WORKFLOW, "ICP Scoring Logic"), scoringNodeCode())
    assert.equal(nodeCode(API_WORKFLOW, "Recalculate Score"), rescoreNodeCode())
  })

  it("the research node scores exactly like the engine", () => {
    const out = freshRun()
    const direct = scoreCompany(normalizeEvidence(basecampClassification, basecampContext))
    assert.equal(out.icp_score, direct.score)
    assert.equal(out.icp_tier, direct.tier)
    assert.deepEqual(out.icp_breakdown.criteria, direct.criteria)
    assert.equal(out.icp_breakdown.snapshot_id, "exec-40814")
    assert.equal(out.icp_breakdown.algorithm_version, "2.0.0")
    assert.equal(out.icp_breakdown.config_version, "psycray-default-2026-11-21")
    assert.equal(out.parsed_synthesis.icp_evidence.domain, "basecamp.com")
    assert.equal(out.score_trigger, "research")
  })

  it("keeps the fields the account-brief prompt reads", () => {
    const out = freshRun()
    assert.equal(typeof out.icp_score, "number")
    assert.ok(Array.isArray(out.scoring_rationale) && out.scoring_rationale.length === 5)
  })

  it("invalid model JSON fails the run instead of saving an empty score", () => {
    assert.throws(() => freshRun({ classification: "Sorry, I can't help with that." }), /Classify ICP Evidence did not return valid JSON/)
  })
})

describe("recalculation (saved research, no new research)", () => {
  const fresh = freshRun()
  const savedRow = {
    domain: "basecamp.com",
    icp_score: fresh.icp_score,
    icp_tier: fresh.icp_tier,
    icp_breakdown: fresh.icp_breakdown,
    synthesized_research: fresh.parsed_synthesis,
  }

  it("uses the same engine as fresh research: identical score and criteria", () => {
    const out = rescore(JSON.parse(JSON.stringify(savedRow)))
    assert.equal(out.http_status, 200)
    assert.equal(out.icp_score, fresh.icp_score)
    assert.deepEqual(out.icp_breakdown.criteria, fresh.icp_breakdown.criteria)
    assert.equal(out.icp_breakdown.evidence_fingerprint, fresh.icp_breakdown.evidence_fingerprint)
  })

  it("keeps the research snapshot id and reports no change", () => {
    const out = rescore(savedRow)
    assert.equal(out.icp_breakdown.snapshot_id, "exec-40814")
    assert.equal(out.icp_breakdown.change.delta, 0)
  })

  it("gives the same answer whenever it runs (recency is measured from the research date)", () => {
    assert.deepEqual(rescore(savedRow, "2027-06-01T00:00:00.000Z").icp_breakdown.criteria, rescore(savedRow).icp_breakdown.criteria)
  })

  it("legacy research without scoring evidence returns 409, not a made-up score", () => {
    const out = rescore({ domain: "nvidia.com", icp_score: 55, icp_tier: "Moderate Fit", icp_breakdown: { criteria: [] }, synthesized_research: { summary: "…" } })
    assert.equal(out.http_status, 409)
  })

  it("an unknown domain returns 404", () => {
    assert.equal(rescore({ domain: null }).http_status, 404)
  })
})

describe("refresh", () => {
  it("compares with the saved score and explains the difference", () => {
    const first = freshRun()
    const withHiring = { ...basecampClassification, growth_signals: [...basecampClassification.growth_signals, basecampHiringSignal] }
    const second = freshRun({ classification: withHiring, previous: first.icp_breakdown, now: "2026-11-23T10:00:00.000Z", exec: "40900" })
    assert.equal(second.score_trigger, "refresh")
    assert.equal(second.icp_breakdown.change.previous_score, 78)
    assert.equal(second.icp_breakdown.change.updated_score, 93)
    assert.match(second.icp_breakdown.change.reasons[0], /^Growth Signals \+15/)
    assert.equal(second.icp_breakdown.previous.snapshot_id, "exec-40814")
  })
})

describe("failed refreshes keep saved research (workflow SQL)", () => {
  const agent = JSON.parse(readFileSync(AGENT_WORKFLOW, "utf8")) as { nodes: { name: string; parameters: Json }[]; connections: Json }
  const node = (name: string) => agent.nodes.find((n) => n.name === name)!

  it("an unreachable website never overwrites a validated row", () => {
    assert.match(node("Store Unreachable Domain").parameters.query, /WHERE company_research\.status <> 'validated'/)
  })

  it("the job tells the user their saved research is unchanged", () => {
    assert.match(node("Job: Unreachable").parameters.options.queryReplacement, /Your saved research is unchanged/)
  })

  it("scoring runs before anything is written, so a scoring error writes nothing", () => {
    const order: string[] = []
    let current = "Synthesize Intelligence & Evidence"
    while (current) {
      order.push(current)
      current = agent.connections[current]?.main?.[0]?.[0]?.node
    }
    assert.deepEqual(order.slice(0, 6), [
      "Synthesize Intelligence & Evidence",
      "Classify ICP Evidence",
      "ICP Scoring Logic",
      "Generate Account Brief",
      "Add Company Research ",
      "Record Score History",
    ])
  })

  it("the cache never serves stale fields on a refresh", () => {
    const q = node("Load Fresh Research by Domain").parameters.query as string
    assert.match(q, /CASE WHEN h\.hit THEN cr\.company_facts END AS company_facts/)
    assert.match(q, /NOT \$3::boolean AS hit/)
  })
})
