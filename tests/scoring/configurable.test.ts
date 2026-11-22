/** Engine v3: configurable ICP, baseline, hard requirements, change attribution. */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { redistribute, totalWeight } from "../../src/lib/scoring/weights.ts"
import {
  DEFAULT_ICP_CONFIG,
  describeConfigChanges,
  evaluate,
  normalizeConfig,
  normalizeCountry,
  normalizeEvidence,
  scoreCompany,
  supplementEvidence,
  toSummary,
  validateConfig,
  type IcpConfig,
  type IcpEvidence,
} from "./engine.ts"
import { basecampClassification, basecampContext, basecampHiringSignal } from "./fixtures.ts"

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const cfg = (patch: (c: IcpConfig) => void, version = "test"): IcpConfig => {
  const c = clone(DEFAULT_ICP_CONFIG)
  c.version = version
  patch(c)
  return c
}
const basecamp = normalizeEvidence(basecampClassification, basecampContext)
const empty = normalizeEvidence({}, { domain: "quiet.example", researched_at: "2026-11-20T00:00:00Z", external_urls: [] })

describe("baseline: score = baseline + (100 − baseline) × weightedFit", () => {
  it("baseline 0 reproduces the default scores (Basecamp 78)", () => {
    assert.equal(scoreCompany(basecamp).score, 78)
  })

  it("baseline 20 → 20 + 80 × 0.78 = 82.4 → 82", () => {
    const r = scoreCompany(basecamp, cfg((c) => (c.baseline = 20)))
    assert.equal(r.score, 82)
    // Criterion points are scaled into the 80-point span, so baseline is never double-counted
    assert.equal(r.criteria.find((c) => c.key === "industry_fit")!.max, 16)
    assert.equal(Math.round(20 + r.criteria.reduce((s, c) => s + c.score, 0)), r.score)
  })

  it("never exceeds 100, even at the maximum baseline with every criterion met", () => {
    const full = {
      ...basecamp,
      employee_counts: [{ min: 30, max: 30, evidence: basecamp.employee_counts[0].evidence }],
    } satisfies IcpEvidence
    const allMet = (baseline: number) =>
      cfg((c) => {
        c.baseline = baseline
        c.growthSignalStrength.product_launch = 1
      })
    assert.equal(scoreCompany(full, allMet(0)).score, 100)
    for (const b of [0, 20, 50, 90]) {
      const r = scoreCompany(full, allMet(b))
      assert.equal(r.score, 100, `baseline ${b}`)
      assert.equal(r.max_possible, 100)
    }
  })

  it("with no evidence the score is the baseline and the maximum is 100", () => {
    const r = scoreCompany(empty, cfg((c) => (c.baseline = 30)))
    assert.equal(r.score, 30)
    assert.equal(r.max_possible, 100)
  })

  it("unknown criteria give a supported minimum and a possible maximum", () => {
    const noSize = normalizeEvidence({ ...basecampClassification, employee_count_evidence: [] }, basecampContext)
    const r = scoreCompany(noSize, cfg((c) => (c.baseline = 20)))
    // known fit = (20 + 30 + 7.5 + 10) / 100 = 0.675 → 20 + 80 × 0.675 = 74; max adds 15% → 20 + 80 × 0.825 = 86
    assert.equal(r.score, 74)
    assert.equal(r.max_possible, 86)
    assert.equal(r.coverage, 85)
    assert.equal(r.tier, "Moderate Fit")
    assert.equal(r.tier_if_unknowns_met, "High Fit")
  })

  it("a baseline change is reported as configuration, not evidence", () => {
    const before = evaluate(basecamp, { snapshot_id: "s1", calculated_at: null })
    const after = evaluate(basecamp, { config: cfg((c) => (c.baseline = 20), "v-baseline-20"), snapshot_id: "s1", calculated_at: null, previous: toSummary(before) })
    const change = after.change!
    assert.equal(change.delta, 4)
    assert.equal(change.evidence_effect, 0)
    assert.equal(change.config_effect, 4)
    assert.ok(change.details.every((d) => d.kind === "configuration"))
    assert.ok(change.details.some((d) => /Baseline \+20: every company now starts at 20/.test(d.text)))
  })
})

describe("change attribution", () => {
  it("weight change only: attributed to configuration, per criterion", () => {
    const before = evaluate(basecamp, { snapshot_id: "s1", calculated_at: null })
    const heavier = cfg((c) => {
      c.weights.growth_signals = 15
      c.weights.industry_fit = 30
    }, "v-industry-30")
    const change = evaluate(basecamp, { config: heavier, snapshot_id: "s1", calculated_at: null, previous: toSummary(before) }).change!
    assert.equal(change.evidence_effect, 0)
    assert.ok(change.details.some((d) => d.kind === "configuration" && /Industry Fit \+10: weight 20% → 30%/.test(d.text)))
    assert.ok(change.details.some((d) => d.kind === "configuration" && /Growth Signals -3: weight 25% → 15%/.test(d.text)))
  })

  it("new evidence only: attributed to evidence", () => {
    const before = evaluate(basecamp, { snapshot_id: "s1", calculated_at: null })
    const more = normalizeEvidence(
      { ...basecampClassification, growth_signals: [...basecampClassification.growth_signals, basecampHiringSignal] },
      basecampContext,
    )
    const change = evaluate(more, { snapshot_id: "s2", calculated_at: null, previous: toSummary(before) }).change!
    assert.equal(change.config_effect, 0)
    assert.equal(change.evidence_effect, 15)
    assert.ok(change.details.every((d) => d.kind === "evidence"))
  })

  it("both changed: the two effects add up to the score change", () => {
    const before = evaluate(basecamp, { snapshot_id: "s1", calculated_at: null })
    const more = normalizeEvidence(
      { ...basecampClassification, growth_signals: [...basecampClassification.growth_signals, basecampHiringSignal] },
      basecampContext,
    )
    const next = evaluate(more, { config: cfg((c) => (c.baseline = 10), "v-b10"), snapshot_id: "s2", calculated_at: null, previous: toSummary(before) })
    const ch = next.change!
    assert.ok(ch.details.some((d) => d.kind === "configuration") && ch.details.some((d) => d.kind === "evidence"))
    assert.ok(Math.abs(ch.config_effect! + ch.evidence_effect! - ch.delta!) <= 1, JSON.stringify(ch))
  })

  it("criteria-rule change with the same evidence is configuration", () => {
    const before = evaluate(basecamp, { snapshot_id: "s1", calculated_at: null })
    const noLaunches = cfg((c) => (c.growthSignalStrength.product_launch = 0), "v-no-launch")
    const change = evaluate(basecamp, { config: noLaunches, snapshot_id: "s1", calculated_at: null, previous: toSummary(before) }).change!
    assert.equal(change.evidence_effect, 0)
    assert.ok(change.details.some((d) => d.kind === "configuration" && /Growth Signals -7.5: criteria rules/.test(d.text)))
  })
})

describe("hard requirements", () => {
  const strict = cfg((c) => {
    c.requirements.location.enabled = true
    c.requirements.b2b.enabled = true
    c.requirements.min_employees = { enabled: true, value: 100 }
  })

  it("are off by default (no revenue or tech-stack restrictions)", () => {
    const r = scoreCompany(basecamp)
    assert.equal(r.qualification, "no_requirements")
    assert.equal(r.requirements.length, 0)
  })

  it("a high score can still fail a requirement", () => {
    const r = scoreCompany(basecamp, strict)
    assert.equal(r.score, 78)
    assert.equal(r.qualification, "disqualified")
    assert.equal(r.requirements.find((x) => x.key === "min_employees")!.status, "fail")
    assert.equal(r.requirements.find((x) => x.key === "location")!.status, "pass")
  })

  it("unknown information is 'unknown', not a failure", () => {
    const r = scoreCompany(empty, strict)
    assert.ok(r.requirements.every((x) => x.status === "unknown"))
    assert.equal(r.qualification, "unverified")
  })

  it("B2B: classified types, then company facts for older evidence", () => {
    const b2b = cfg((c) => (c.requirements.b2b.enabled = true))
    assert.equal(scoreCompany(normalizeEvidence({ customer_types: [{ type: "b2c", evidence: "Shop online", source: "https://quiet.example" }] }, { domain: "quiet.example", researched_at: "2026-11-20T00:00:00Z", external_urls: [] }), b2b).qualification, "disqualified")
    const v2Evidence = clone(basecamp) as IcpEvidence
    delete v2Evidence.customer_types
    assert.equal(scoreCompany(v2Evidence, b2b).qualification, "unverified")
    assert.equal(scoreCompany(supplementEvidence(v2Evidence, { customer_types: ["B2B"] }), b2b).qualification, "qualified")
  })

  it("minimum revenue: pass, fail, and unknown when sources straddle the threshold", () => {
    const rev = (min_usd: number, max_usd: number) =>
      normalizeEvidence({ annual_revenue_evidence: [{ min_usd, max_usd, evidence: "Revenue", source: "https://quiet.example" }] }, { domain: "quiet.example", researched_at: "2026-11-20T00:00:00Z", external_urls: [] })
    const c = cfg((x) => (x.requirements.min_revenue = { enabled: true, usd: 1_000_000 }))
    assert.equal(scoreCompany(rev(2e6, 5e6), c).requirements[0].status, "pass")
    assert.equal(scoreCompany(rev(1e5, 5e5), c).requirements[0].status, "fail")
    assert.equal(scoreCompany(rev(5e5, 2e6), c).requirements[0].status, "unknown")
  })

  it("country names are normalised", () => {
    assert.equal(normalizeCountry("U.S.A."), "United States")
    assert.equal(normalizeCountry("usa"), "United States")
    assert.equal(normalizeCountry("germany"), "Germany")
  })
})

describe("configuration validation", () => {
  it("the default configuration is valid", () => {
    assert.deepEqual(validateConfig(DEFAULT_ICP_CONFIG), [])
  })

  it("catches invalid configurations", () => {
    const cases: [string, (c: IcpConfig) => void, RegExp][] = [
      ["total ≠ 100", (c) => (c.weights.industry_fit = 21), /total exactly 100% \(currently 101%\)/],
      ["fractional weight", (c) => { c.weights.industry_fit = 19.5; c.weights.company_size = 15.5 }, /whole number/],
      ["baseline too high", (c) => (c.baseline = 95), /Baseline must be/],
      ["overlapping ranges", (c) => (c.sizeBands[1].max = 60), /overlap/],
      ["no target industry", (c) => (c.industryFit = {}), /at least one target industry/],
      ["location without countries", (c) => { c.requirements.location.enabled = true; c.geography.countries = [] }, /at least one country/],
      ["inferred above stated", (c) => (c.digitalOpportunity.inferred = 1.2), /0–100%/],
      ["tiers inverted", (c) => (c.tiers.moderate = 90), /Moderate < High/],
    ]
    for (const [name, patch, re] of cases) {
      assert.ok(validateConfig(cfg(patch)).some((e) => re.test(e)), name)
      assert.throws(() => scoreCompany(basecamp, cfg(patch)), /Invalid ICP configuration/, name)
    }
  })

  it("normalizeConfig round-trips and fills fields missing from older configs", () => {
    assert.deepEqual(normalizeConfig(clone(DEFAULT_ICP_CONFIG)), DEFAULT_ICP_CONFIG)
    const old = { version: "x", weights: DEFAULT_ICP_CONFIG.weights }
    const n = normalizeConfig(old)
    assert.equal(n.baseline, 0)
    assert.deepEqual(n.requirements, DEFAULT_ICP_CONFIG.requirements)
    assert.deepEqual(validateConfig(n), [])
  })

  it("describes what changed between versions", () => {
    const after = cfg((c) => {
      c.baseline = 10
      c.weights.industry_fit = 25
      c.weights.growth_signals = 20
      c.requirements.b2b.enabled = true
    })
    const kinds = describeConfigChanges(DEFAULT_ICP_CONFIG, after).map((d) => `${d.kind}: ${d.text}`)
    assert.deepEqual(kinds, [
      "baseline: Baseline 0 → 10",
      "weights: Industry Fit weight 20% → 25%",
      "weights: Growth Signals weight 25% → 20%",
      "requirements: Hard requirements: Sells to businesses (B2B)",
    ])
  })
})

describe("weight redistribution (Studio helper)", () => {
  const w = DEFAULT_ICP_CONFIG.weights

  it("scales unlocked weights proportionally to keep 100%", () => {
    const r = redistribute(w, "industry_fit", 40, new Set())
    assert.ok("weights" in r)
    assert.equal(totalWeight(r.weights), 100)
    assert.equal(r.weights.industry_fit, 40)
    // 60 left, split 15:30:25:10 → 11.25, 22.5, 18.75, 7.5 → 11, 23, 19, 7 (largest remainders get the spare points)
    assert.deepEqual(r.weights, { industry_fit: 40, company_size: 11, digital_opportunity: 23, growth_signals: 19, project_ownership: 7 })
    assert.ok(r.changes.includes("Industry Fit 20% → 40%"))
  })

  it("leaves locked weights alone", () => {
    const r = redistribute(w, "industry_fit", 30, new Set(["digital_opportunity"] as const))
    assert.ok("weights" in r)
    assert.equal(r.weights.digital_opportunity, 30)
    assert.equal(totalWeight(r.weights), 100)
  })

  it("refuses when locked weights leave no room", () => {
    const r = redistribute(w, "industry_fit", 80, new Set(["digital_opportunity"] as const))
    assert.ok("error" in r && /at most 70%/.test(r.error))
  })

  it("is deterministic", () => {
    assert.deepEqual(redistribute(w, "company_size", 33, new Set()), redistribute(w, "company_size", 33, new Set()))
  })
})
