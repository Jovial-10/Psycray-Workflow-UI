import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import {
  DEFAULT_ICP_CONFIG,
  ENGINE_FREE_OF_CLOCK_CHECK,
  compareScores,
  evaluate,
  fingerprint,
  normalizeEvidence,
  scoreCompany,
  summarizeStored,
  toSummary,
  type IcpConfig,
} from "./engine.ts"
import {
  basecampClassification,
  basecampContext,
  basecampHiringSignal,
  consultancyClassification,
  consultancyContext,
} from "./fixtures.ts"

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const byCriterion = (r: ReturnType<typeof scoreCompany>, name: string) => r.criteria.find((c) => c.criterion === name)!

describe("configuration", () => {
  it("uses Psycray's weights: 20 / 15 / 30 / 25 / 10", () => {
    assert.deepEqual(DEFAULT_ICP_CONFIG.weights, {
      industry_fit: 20,
      company_size: 15,
      digital_opportunity: 30,
      growth_signals: 25,
      project_ownership: 10,
    })
  })

  it("rejects weights that don't sum to 100", () => {
    const bad: IcpConfig = { ...DEFAULT_ICP_CONFIG, weights: { ...DEFAULT_ICP_CONFIG.weights, industry_fit: 25 } }
    const ev = normalizeEvidence(basecampClassification, basecampContext)
    assert.throws(() => scoreCompany(ev, bad), /total exactly 100%/)
  })
})

describe("determinism", () => {
  it("identical evidence + identical config = identical result (100 runs)", () => {
    const ev = normalizeEvidence(basecampClassification, basecampContext)
    const first = scoreCompany(ev)
    for (let i = 0; i < 100; i++) assert.deepEqual(scoreCompany(clone(ev)), first)
  })

  it("re-normalising the same classification gives the same evidence fingerprint", () => {
    const a = normalizeEvidence(basecampClassification, basecampContext)
    const b = normalizeEvidence(clone(basecampClassification), { ...basecampContext })
    assert.equal(fingerprint(a), fingerprint(b))
  })

  it("the engine never reads the clock or randomness", () => {
    // Recency is measured from evidence.researched_at, so a recalculation
    // next year gives the same score as today.
    assert.equal(ENGINE_FREE_OF_CLOCK_CHECK(), true)
  })
})

describe("refresh with unchanged evidence", () => {
  // A refresh re-runs the LLM. It may list the same facts in another order,
  // with different casing, spacing or duplicates. None of that may move the score.
  const reworded = {
    ...basecampClassification,
    industry: { ...basecampClassification.industry, category: "SaaS", label: "  Project management software " },
    digital_needs: [...basecampClassification.digital_needs, ...basecampClassification.digital_needs],
    growth_signals: [...basecampClassification.growth_signals].reverse(),
    project_owners: basecampClassification.project_owners.map((o) => ({ ...o, type: "Technical Leader" })),
  }

  it("does not change the score", () => {
    const before = scoreCompany(normalizeEvidence(basecampClassification, basecampContext))
    const after = scoreCompany(normalizeEvidence(reworded, { ...basecampContext, unknowns: ["Exact employee count", "Annual revenue"] }))
    assert.equal(after.score, before.score)
    assert.deepEqual(after.criteria, before.criteria)
  })

  it("explains that nothing changed", () => {
    const ev = normalizeEvidence(basecampClassification, basecampContext)
    const prev = evaluate(ev, { snapshot_id: "exec-1", calculated_at: "2026-11-22T02:35:00Z" })
    const next = evaluate(normalizeEvidence(reworded, basecampContext), {
      snapshot_id: "exec-2",
      calculated_at: "2026-11-23T09:00:00Z",
      previous: toSummary(prev),
    })
    assert.equal(next.change?.delta, 0)
    assert.deepEqual(next.change?.reasons, ["Evidence and configuration unchanged; the score is identical."])
  })
})

describe("verified evidence changes", () => {
  const ev1 = normalizeEvidence(basecampClassification, basecampContext)
  const withHiring = {
    ...basecampClassification,
    growth_signals: [...basecampClassification.growth_signals, basecampHiringSignal],
  }
  const ev2 = normalizeEvidence(withHiring, { ...basecampContext, researched_at: "2026-11-23T10:00:00.000Z" })
  const prev = evaluate(ev1, { snapshot_id: "exec-1", calculated_at: "2026-11-22T02:35:00Z" })
  const next = evaluate(ev2, { snapshot_id: "exec-2", calculated_at: "2026-11-23T10:00:00Z", previous: toSummary(prev) })

  it("a new verified hiring signal raises Growth Signals only", () => {
    assert.ok(next.score > prev.score, `${next.score} should exceed ${prev.score}`)
    for (const c of next.criteria) {
      const before = byCriterion(prev, c.criterion)
      if (c.criterion === "Growth Signals") assert.ok(c.score > before.score)
      else assert.equal(c.score, before.score, c.criterion)
    }
  })

  it("the change explanation is built from the actual difference", () => {
    const change = next.change!
    assert.equal(change.previous_score, prev.score)
    assert.equal(change.updated_score, next.score)
    assert.equal(change.reasons.length, 1)
    assert.match(change.reasons[0], /^Growth Signals \+15 \(7\.5 → 22\.5\): new evidence: "Basecamp is hiring two senior programmers" \(https:\/\/basecamp\.com\/jobs\)/)
  })

  it("prints the before/after the sales team sees", () => {
    console.log(`      Previous Score: ${next.change!.previous_score}`)
    console.log(`      Updated Score: ${next.change!.updated_score}`)
    console.log(`      Reason: ${next.change!.reasons[0]}`)
  })

  it("a configuration change is named as the reason", () => {
    const cfg: IcpConfig = {
      ...DEFAULT_ICP_CONFIG,
      version: "test-heavier-size",
      weights: { ...DEFAULT_ICP_CONFIG.weights, company_size: 25, digital_opportunity: 20 },
    }
    const rescored = evaluate(ev1, { config: cfg, snapshot_id: "exec-1", calculated_at: "2026-11-24T00:00:00Z", previous: toSummary(prev) })
    assert.match(rescored.change!.reasons[0], /ICP configuration changed from "psycray-default-2026-11-21" to "test-heavier-size"/)
  })
})

describe("missing and conflicting evidence", () => {
  it("no evidence at all: every criterion unknown, not failed", () => {
    const r = scoreCompany(normalizeEvidence({}, { domain: "quiet.example", researched_at: "2026-11-20T00:00:00Z", external_urls: [] }))
    assert.equal(r.score, 0)
    assert.ok(r.criteria.every((c) => c.status === "unknown"))
    assert.equal(r.coverage, 0)
    assert.equal(r.max_possible, 100)
    assert.equal(r.tier, "Needs Review")
    assert.equal(r.missing.length, 5)
  })

  it("an unknown criterion earns 0 points, is listed as missing, and lowers coverage", () => {
    const noSize = { ...basecampClassification, employee_count_evidence: [] }
    const r = scoreCompany(normalizeEvidence(noSize, basecampContext))
    const size = byCriterion(r, "Company Size")
    assert.equal(size.status, "unknown")
    assert.equal(size.score, 0)
    assert.equal(r.coverage, 85)
    assert.ok(r.missing.some((m) => m.startsWith("Company Size")))
    assert.equal(r.max_possible, r.score + 15)
  })

  it("missing evidence is handled the same way every time", () => {
    const ctx = { domain: "quiet.example", researched_at: "2026-11-20T00:00:00Z", external_urls: [] }
    assert.deepEqual(scoreCompany(normalizeEvidence({}, ctx)), scoreCompany(normalizeEvidence({ growth_signals: [] }, ctx)))
  })

  it("conflicting employee counts are flagged and scored on the lower-fit reading", () => {
    const conflicting = {
      ...basecampClassification,
      employee_count_evidence: [
        { value: 40, evidence: "About 40 people", source: "https://basecamp.com/about" },
        { value: 600, evidence: "600 employees", source: "https://techcrunch.com/2026/10/anthropic-nvidia-back-basecamp-research-140m" },
      ],
    }
    const size = byCriterion(scoreCompany(normalizeEvidence(conflicting, basecampContext)), "Company Size")
    assert.equal(size.status, "conflicting")
    assert.equal(size.score, 3.8) // 15 × 0.25, the 251–1,000 band
  })
})

describe("growth-signal contamination", () => {
  it("signals about same-name companies are excluded", () => {
    const r = scoreCompany(normalizeEvidence(basecampClassification, basecampContext))
    const growth = byCriterion(r, "Growth Signals")
    assert.equal(growth.score, 7.5) // product launch only (25 × 0.3)
    assert.ok(!growth.evidence.some((e) => /Basecamp (Research|Fitness)/.test(e.text)))
  })

  it("signals citing a URL the research never retrieved are excluded", () => {
    const invented = {
      ...basecampClassification,
      growth_signals: [{ ...basecampHiringSignal, source_url: "https://made-up.example/basecamp-hiring" }],
    }
    assert.equal(byCriterion(scoreCompany(normalizeEvidence(invented, basecampContext)), "Growth Signals").score, 0)
  })

  it("signals older than the window are excluded, measured from the research date", () => {
    const old = { ...basecampClassification, growth_signals: [{ ...basecampHiringSignal, date: "2024-01-10" }] }
    const growth = byCriterion(scoreCompany(normalizeEvidence(old, basecampContext)), "Growth Signals")
    assert.equal(growth.score, 0)
    assert.equal(growth.status, "not_met")
  })
})

describe("industry is judged on the company's own industry", () => {
  it("Basecamp (SaaS) gets full Industry Fit from its own category", () => {
    const r = scoreCompany(normalizeEvidence(basecampClassification, basecampContext))
    const industry = byCriterion(r, "Industry Fit")
    assert.equal(industry.status, "met")
    assert.equal(industry.score, 20)
    assert.equal(r.score, 78)
    assert.equal(r.tier, "Moderate Fit")
  })

  it("a consultancy that serves SaaS companies is not scored as SaaS", () => {
    const industry = byCriterion(scoreCompany(normalizeEvidence(consultancyClassification, consultancyContext)), "Industry Fit")
    assert.equal(industry.status, "partial")
    assert.equal(industry.score, 10)
  })

  it("contains no company-specific exceptions", () => {
    const src = readFileSync(new URL("../../src/lib/scoring/icpEngine.ts", import.meta.url), "utf8").toLowerCase()
    for (const name of ["basecamp", "nvidia", "zapier", "dropbox"]) assert.ok(!src.includes(name), name)
  })
})

describe("legacy scores", () => {
  it("comparing with a keyword-rule score says the scales differ", () => {
    const legacy = summarizeStored(
      { criteria: [{ criterion: "Industry Fit", score: 35, max: 35, status: "met", reason: "Core vertical" }] },
      55,
      "Moderate Fit",
    )
    const next = evaluate(normalizeEvidence(basecampClassification, basecampContext), {
      snapshot_id: "exec-2",
      calculated_at: "2026-11-23T00:00:00Z",
      previous: legacy,
    })
    assert.equal(next.change!.previous_score, 55)
    assert.match(next.change!.reasons[0], /legacy keyword rules/)
  })

  it("compareScores returns null when there is no previous score", () => {
    const r = scoreCompany(normalizeEvidence(basecampClassification, basecampContext))
    assert.equal(compareScores(null, r), null)
    assert.equal(summarizeStored(null, null, null), null)
  })
})
