/** The configurable-ICP n8n nodes, run with stubbed n8n globals. */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { AGENT_WORKFLOW, API_WORKFLOW, ICP_WORKFLOW, nodeCode } from "../../scripts/n8n-scoring.ts"
import { DEFAULT_ICP_CONFIG, evaluate, normalizeEvidence, type IcpConfig } from "./engine.ts"
import { BASECAMP_SEARCH_RESULTS, basecampClassification, basecampContext } from "./fixtures.ts"
import { modelOutput, runCodeNode } from "./n8nHarness.ts"

type Json = Record<string, any>
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const evidence = normalizeEvidence(basecampClassification, basecampContext)
const v1 = evaluate(evidence, { snapshot_id: "exec-1", calculated_at: "2026-11-22T00:00:00Z", config_version_id: 1 })
const v2Config: IcpConfig = { ...clone(DEFAULT_ICP_CONFIG), version: "psycray-default-v2", baseline: 20 }

/** A company_research row as the SQL returns it. */
const savedRow = (breakdown: Json = v1): Json => ({
  domain: "basecamp.com",
  icp_score: breakdown.score,
  icp_tier: breakdown.tier,
  icp_breakdown: clone(breakdown),
  synthesized_research: { summary: "…", icp_evidence: clone(evidence) },
  company_facts: { customer_types: ["B2B"] },
})

const run = (file: string, node: string, ctx: Parameters<typeof runCodeNode>[1]) => runCodeNode(nodeCode(file, node)!, ctx)[0].json as Json

describe("the published config is applied everywhere", () => {
  it("fresh research uses the active config and records its version id", () => {
    const out = run(AGENT_WORKFLOW, "ICP Scoring Logic", {
      nodes: {
        "Synthesize Intelligence & Evidence": [modelOutput({ unknowns: [] })],
        "Classify ICP Evidence": [modelOutput(basecampClassification)],
        "Extract Core Company Facts": [modelOutput({ customer_types: ["B2B"] })],
        "Load Fresh Research by Domain": [{ json: { candidate_domain: "basecamp.com", active_config: v2Config, active_config_id: 2 } }],
        "Find Growth Signals": BASECAMP_SEARCH_RESULTS.map((url) => ({ json: { url } })),
      },
      json: {},
      now: basecampContext.researched_at,
    })
    assert.equal(out.icp_breakdown.config_version, "psycray-default-v2")
    assert.equal(out.icp_breakdown.config_version_id, 2)
    assert.equal(out.icp_score, 82) // 20 + 80 × 0.78
    assert.deepEqual(out.icp_evidence.customer_types.map((c: Json) => c.type), ["B2B"])
  })

  it("cached research scored with an older version is rescored with the active one", () => {
    const row = { ...savedRow(), prev_icp_breakdown: clone(v1), prev_icp_score: 78, prev_icp_tier: "Moderate Fit", active_config: v2Config, active_config_id: 2 }
    const out = run(AGENT_WORKFLOW, "Apply Active ICP", { nodes: {}, input: [{ json: row }] })
    assert.equal(out.rescored, true)
    assert.equal(out.icp_score, 82)
    assert.equal(out.icp_breakdown.snapshot_id, "exec-1") // same research snapshot
    assert.equal(out.icp_breakdown.change.config_effect, 4)
    assert.equal(out.icp_breakdown.change.evidence_effect, 0)
  })

  it("cached research already on the active version is left alone", () => {
    const row = { ...savedRow(), prev_icp_breakdown: clone(v1), prev_icp_score: 78, prev_icp_tier: "Moderate Fit", active_config: DEFAULT_ICP_CONFIG, active_config_id: 1 }
    const out = run(AGENT_WORKFLOW, "Apply Active ICP", { nodes: {}, input: [{ json: row }] })
    assert.equal(out.rescored, false)
    assert.equal(out.icp_score, 78)
  })

  it("manual recalculation uses the active config", () => {
    const out = run(API_WORKFLOW, "Recalculate Score", { nodes: {}, input: [{ json: { ...savedRow(), active_config: v2Config, active_config_id: 2 } }] })
    assert.equal(out.http_status, 200)
    assert.equal(out.icp_score, 82)
    assert.equal(out.icp_breakdown.config_version_id, 2)
  })

  it("cached, fresh and recalculated scores agree for the same evidence and version", () => {
    const fresh = evaluate(evidence, { config: v2Config, snapshot_id: "exec-1", calculated_at: null })
    const cached = run(AGENT_WORKFLOW, "Apply Active ICP", { nodes: {}, input: [{ json: { ...savedRow(), prev_icp_breakdown: clone(v1), prev_icp_score: 78, active_config: v2Config, active_config_id: 2 } }] })
    const recalc = run(API_WORKFLOW, "Recalculate Score", { nodes: {}, input: [{ json: { ...savedRow(), active_config: v2Config, active_config_id: 2 } }] })
    assert.deepEqual(cached.icp_breakdown.criteria, fresh.criteria)
    assert.deepEqual(recalc.icp_breakdown.criteria, fresh.criteria)
  })
})

describe("POST /icp/rescore: recalculate saved companies", () => {
  const legacy = { domain: "nvidia.com", icp_score: 55, icp_tier: "Moderate Fit", icp_breakdown: { criteria: [] }, synthesized_research: { summary: "…" }, company_facts: {} }

  it("rescores companies with evidence, skips up-to-date ones and lists legacy rows that need a refresh", () => {
    const current = { ...savedRow(evaluate(evidence, { config: v2Config, snapshot_id: "exec-1", calculated_at: null })), domain: "already.example" }
    const out = run(ICP_WORKFLOW, "Rescore Saved Companies", {
      nodes: {},
      input: [{ json: { active_config: v2Config, active_config_id: 2, rows: [savedRow(), legacy, current] } }],
    })
    assert.equal(out.summary.rescored, 1)
    assert.equal(out.summary.up_to_date, 1)
    assert.deepEqual(out.summary.needs_refresh, ["nvidia.com"])
    assert.deepEqual(out.summary.changes, [{ domain: "basecamp.com", previous: 78, updated: 82 }])
    assert.equal(out.updates[0].result.config_version, "psycray-default-v2")
  })
})

describe("POST /icp/config: server-side validation before publishing", () => {
  const publish = (body: Json, active: Json = { profile_id: 1, slug: "psycray-default", active_version_id: 1, active_config: DEFAULT_ICP_CONFIG, max_version: 1 }) =>
    run(ICP_WORKFLOW, "Validate ICP Config", {
      nodes: { "Publish ICP Request": [{ json: { body } }] },
      input: [{ json: active }],
    })

  it("accepts a valid change and labels the next version", () => {
    const out = publish({ base_version_id: 1, config: { ...DEFAULT_ICP_CONFIG, baseline: 10 }, note: "Try a baseline", published_by: "  Test Person " })
    assert.equal(out.http_status, 201)
    assert.equal(out.label, "psycray-default-v2")
    assert.equal(out.version, 2)
    assert.equal(out.published_by, "Test Person")
    assert.deepEqual(out.change_summary, [{ kind: "baseline", text: "Baseline 0 → 10" }])
  })

  it("publisher name is optional attribution, defaulting to 'Psycray team'", () => {
    assert.equal(publish({ base_version_id: 1, config: { ...DEFAULT_ICP_CONFIG, baseline: 5 } }).published_by, "Psycray team")
    assert.equal(publish({ base_version_id: 1, config: { ...DEFAULT_ICP_CONFIG, baseline: 5 }, published_by: "x".repeat(200) }).published_by.length, 60)
  })

  it("rejects weights that don't total 100", () => {
    const out = publish({ base_version_id: 1, config: { ...DEFAULT_ICP_CONFIG, weights: { ...DEFAULT_ICP_CONFIG.weights, industry_fit: 30 } } })
    assert.equal(out.http_status, 400)
    assert.ok(out.details.some((d: string) => /total exactly 100%/.test(d)))
  })

  it("rejects a publish based on an outdated version (someone else published)", () => {
    assert.equal(publish({ base_version_id: 1, config: DEFAULT_ICP_CONFIG }, { profile_id: 1, slug: "psycray-default", active_version_id: 3, active_config: DEFAULT_ICP_CONFIG, max_version: 3 }).http_status, 409)
  })

  it("rejects publishing an identical configuration", () => {
    assert.match(publish({ base_version_id: 1, config: DEFAULT_ICP_CONFIG }).error, /Nothing changed/)
  })

  it("ignores a client-supplied version label", () => {
    assert.equal(publish({ base_version_id: 1, config: { ...DEFAULT_ICP_CONFIG, version: "hacked", baseline: 5 } }).label, "psycray-default-v2")
  })
})

describe("persistence", () => {
  const sql = readFileSync(new URL("../../n8n/sql/003_icp_profiles.sql", import.meta.url), "utf8")

  it("migration 003 seeds version 1 with exactly the engine's default config", () => {
    const seed = sql.match(/\$config\$([\s\S]*?)\$config\$/)![1]
    assert.deepEqual(JSON.parse(seed), DEFAULT_ICP_CONFIG)
  })

  it("is additive and keeps published versions immutable", () => {
    assert.doesNotMatch(sql, /\bDROP TABLE\b|\bDELETE FROM\b|\bTRUNCATE\b|DROP COLUMN/i)
    assert.match(sql, /BEFORE UPDATE OR DELETE ON icp_config_versions/)
  })

  it("has no login or admin-key checks (access is controlled at the server)", () => {
    const wf = readFileSync(ICP_WORKFLOW, "utf8")
    assert.doesNotMatch(wf, /x-psycray-admin|icp_admins|Authorize/i)
    const parsed = JSON.parse(wf) as { connections: Json }
    assert.equal(parsed.connections["Publish ICP Request"].main[0][0].node, "Load Active Version")
    assert.equal(parsed.connections["Rescore All Request"].main[0][0].node, "Load Saved Companies")
  })
})

describe("POST /icp/interpret: the assistant's n8n nodes", () => {
  const prepare = (body: Json) => run(ICP_WORKFLOW, "Prepare Instruction", { nodes: {}, input: [{ json: { body } }] })
  const build = (reply: Json, config: Json = DEFAULT_ICP_CONFIG) =>
    run(ICP_WORKFLOW, "Build Proposal", { nodes: { "Prepare Instruction": [{ json: { config } }] }, input: [{ json: reply.json ?? reply }] })

  it("rejects empty or over-long instructions before any model call", () => {
    assert.equal(prepare({ instruction: "", config: DEFAULT_ICP_CONFIG }).http_status, 400)
    assert.equal(prepare({ instruction: "x".repeat(1001), config: DEFAULT_ICP_CONFIG }).http_status, 400)
    assert.equal(prepare({ instruction: "Set the baseline to 10" }).http_status, 400)
  })

  it("builds the prompt from the current draft", () => {
    const out = prepare({ instruction: "Set the baseline to 10", config: { ...DEFAULT_ICP_CONFIG, baseline: 3 } })
    assert.equal(out.http_status, 200)
    assert.equal(out.instruction_chars, 22)
    assert.match(out.prompt, /"baseline":3/)
  })

  it("turns a valid model reply into a proposal (nothing is saved)", () => {
    const out = build(modelOutput({ changes: [{ op: "set_baseline", value: 10, interpreted: false }], ambiguities: [], contradictions: [], unsupported: [], summary: "Baseline to 10" }))
    assert.equal(out.http_status, 200)
    assert.equal(out.proposal.requested.baseline, 10)
    assert.deepEqual(out.proposal.changes, [{ kind: "baseline", text: "Baseline 0 → 10" }])
  })

  it("malformed model output and model failures become understandable errors", () => {
    assert.match(build(modelOutput("I think you should weight SaaS more.")).error, /wasn't valid JSON\. Nothing was changed/)
    assert.equal(build({ error: { message: "429 from OpenAI" } }).http_status, 502)
    assert.match(build({ error: { message: "timeout" } }).error, /unavailable/)
  })

  it("the rate limit runs before the model, and a model failure never crashes the request", () => {
    const wf = JSON.parse(readFileSync(ICP_WORKFLOW, "utf8")) as { nodes: Json[]; connections: Json }
    assert.equal(wf.connections["Is Instruction Valid?"].main[0][0].node, "Check Assistant Rate Limit")
    assert.equal(wf.connections["Is Under Rate Limit?"].main[0][0].node, "Interpret ICP Instruction")
    assert.equal(wf.connections["Is Under Rate Limit?"].main[1][0].node, "Respond 429 Rate Limited")
    assert.equal(wf.nodes.find((n) => n.name === "Interpret ICP Instruction")!.onError, "continueRegularOutput")
    // The assistant has no path to the database writes that publish or rescore
    const reachable = new Set<string>()
    const walk = (name: string) => {
      if (reachable.has(name)) return
      reachable.add(name)
      for (const outs of wf.connections[name]?.main ?? []) for (const t of outs) walk(t.node)
    }
    walk("Interpret Instruction Request")
    for (const write of ["Save ICP Version", "Save Rescored Companies"]) assert.ok(!reachable.has(write), write)
  })
})

describe("POST /icp/archive", () => {
  const check = (r: Json) =>
    run(ICP_WORKFLOW, "Check Archive Result", { nodes: { "Archive Version Request": [{ json: { body: { version_id: 3 } } }] }, input: [{ json: r }] })

  it("refuses version 1 and the active version, and 404s unknown versions", () => {
    assert.match(check({ found: 1, version: 1, is_active: false, archive: true }).error, /original version/)
    assert.match(check({ found: 1, version: 3, is_active: true, archive: true }).error, /active version cannot be archived/)
    assert.equal(check({ found: 0, version: null, is_active: false, archive: true }).http_status, 404)
  })

  it("archives and restores other versions", () => {
    assert.deepEqual(check({ found: 1, version: 3, is_active: false, archive: true }), { http_status: 200, version_id: 3, archived: true })
    assert.equal(check({ found: 1, version: 3, is_active: false, archive: false }).archived, false)
  })

  it("never deletes a version, and version 1 is also guarded in the database", () => {
    const wf = readFileSync(ICP_WORKFLOW, "utf8")
    assert.doesNotMatch(wf, /DELETE FROM icp_config_versions/)
    const sql = readFileSync(new URL("../../n8n/sql/005_icp_archive_and_assistant.sql", import.meta.url), "utf8")
    assert.match(sql, /cannot be archived/)
    assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE/i)
  })
})
