/**
 * Reproduces the original inconsistency with the ORIGINAL "ICP Scoring Logic"
 * node (from the pre-change backup), using Basecamp facts from real runs.
 * The company didn't change, but the LLM worded its summary differently, and
 * the keyword rules moved the score by 35 points.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { modelOutput, runCodeNode } from "./n8nHarness.ts"

const backup = JSON.parse(
  readFileSync(new URL("../../n8n/workflows/backups/psycray-research-agent-v2.2026-11-13.json", import.meta.url), "utf8"),
) as { nodes: { name: string; parameters: { jsCode?: string } }[] }
const legacyCode = backup.nodes.find((n) => n.name === "ICP Scoring Logic")!.parameters.jsCode!

function legacyScore(synthesis: unknown) {
  const [out] = runCodeNode(legacyCode, { nodes: { "Synthesize Intelligence & Evidence": [modelOutput(synthesis)] }, json: {} })
  return out.json as { icp_score: number; icp_breakdown: { criterion: string; score: number }[] }
}

// Same company, same facts, two wordings the model produced on different runs.
const run1 = {
  summary: "Basecamp offers a project management system used by teams to organise work.",
  confirmed_facts: [{ fact: "Basecamp offers a project management system", source: "basecamp.com" }],
  recent_signals: [
    { signal: "Basecamp is integrating AI agent accessibility via a CLI", source_url: "https://basecamp.com/agents", date: "2026-03-25" },
  ],
}
const run2 = {
  ...run1,
  confirmed_facts: [
    ...run1.confirmed_facts,
    { fact: "Basecamp targets industries like software development, education, marketing, logistics", source: "basecamp.com" },
  ],
}

describe("legacy keyword scoring (root cause)", () => {
  it("scores the same company 20 or 55 depending on wording", () => {
    const a = legacyScore(run1)
    const b = legacyScore(run2)
    console.log(`      legacy run 1: ${a.icp_score} · legacy run 2: ${b.icp_score}`)
    assert.equal(a.icp_score, 20)
    assert.equal(b.icp_score, 55)
  })

  it("awards Industry Fit for the customers' industry ('software development'), not Basecamp's own", () => {
    assert.equal(legacyScore(run2).icp_breakdown.find((c) => c.criterion === "Industry Fit")!.score, 35)
  })

  it("ignores recent_signals, and 'integrating' misses /integration/", () => {
    const b = legacyScore(run2)
    assert.equal(b.icp_breakdown.find((c) => c.criterion === "Growth Signals")!.score, 0)
    assert.equal(b.icp_breakdown.find((c) => c.criterion === "Digital Opportunity")!.score, 0)
  })

  it("a same-name company's funding round in the summary adds +20", () => {
    const contaminated = { ...run1, summary: run1.summary + " Basecamp Research raised funding from Anthropic and Nvidia." }
    assert.equal(legacyScore(contaminated).icp_score - legacyScore(run1).icp_score, 20)
  })
})
