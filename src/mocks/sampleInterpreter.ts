/**
 * Sample-mode stand-in for the ICP assistant's model. It understands only a
 * few simple phrasings and produces the same JSON the real model returns, so
 * the UI and the real proposal code (parse → validate → apply) are exercised
 * without an AI call. Live mode uses the model through n8n.
 */
const CRITERIA: [RegExp, string][] = [
  [/industry fit/i, "industry_fit"],
  [/company size/i, "company_size"],
  [/digital opportunit(y|ies)/i, "digital_opportunity"],
  [/growth signals?/i, "growth_signals"],
  [/project ownership/i, "project_ownership"],
]
const INDUSTRIES: [RegExp, string][] = [
  [/\bsaas\b/i, "saas"],
  [/\bsoftware\b/i, "software"],
  [/manufactur/i, "manufacturing"],
  [/logistics/i, "logistics"],
  [/agenc/i, "agency"],
  [/associations?/i, "association"],
]

export function sampleInterpret(instruction: string): string {
  const t = instruction
  const changes: Record<string, unknown>[] = []
  const ambiguities: string[] = []
  const unsupported: string[] = []

  for (const [re, criterion] of CRITERIA) {
    const m = t.match(new RegExp(`${re.source}[^\\d%.]{0,30}?(\\d{1,3})\\s*%`, "i"))
    if (m) changes.push({ op: "set_weight", criterion, percent: Number(m[m.length - 1]), interpreted: false })
    else if (new RegExp(`${re.source}\\s+(less|less important|lower)`, "i").test(t) || new RegExp(`(less|lower)[^.]{0,20}${re.source}`, "i").test(t)) {
      changes.push({ op: "set_weight", criterion, percent: 10, interpreted: true })
      ambiguities.push(`"Less important" read as 10% for ${criterion.replace(/_/g, " ")}.`)
    } else if (new RegExp(`priorit\\w*[^.]{0,20}${re.source}`, "i").test(t)) {
      changes.push({ op: "set_weight", criterion, percent: 30, interpreted: true })
      ambiguities.push(`"Prioritize" read as 30% for ${criterion.replace(/_/g, " ")}.`)
    }
  }
  const baseline = t.match(/baseline[^\d]{0,15}(\d{1,2})\b/i)
  if (baseline) changes.push({ op: "set_baseline", value: Number(baseline[1]), interpreted: false })
  const range = t.match(/(\d{1,6})\s*(?:–|-|to)\s*(\d{1,6})\s*employees/i)
  if (range) changes.push({ op: "set_size_band", min: Number(range[1]), max: Number(range[2]), fit_percent: 100 })
  if (/focus|priorit|prefer/i.test(t)) {
    for (const [re, category] of INDUSTRIES) if (re.test(t)) changes.push({ op: "set_industry", category, level: "core" })
  }
  if (/\bonly\b|\bmust\b|\brequire/i.test(t)) {
    if (/u\.?s\.?[- ]?based|united states|\bus\b/i.test(t)) {
      changes.push({ op: "set_requirement", requirement: "location", enabled: true, value: null }, { op: "set_countries", countries: ["United States"] })
    }
    if (/\bb2b\b/i.test(t)) changes.push({ op: "set_requirement", requirement: "b2b", enabled: true, value: null })
    const min = t.match(/at least (\d{1,6}) employees/i)
    if (min) changes.push({ op: "set_requirement", requirement: "min_employees", enabled: true, value: Number(min[1]) })
  }
  if (/tech(nology)? stack|salesforce|hubspot|react/i.test(t)) unsupported.push("Technology-stack criteria aren't supported.")
  if (changes.length === 0 && unsupported.length === 0) {
    unsupported.push("Sample mode only understands simple instructions (e.g. “Set the baseline to 10”). Live mode uses the AI assistant.")
  }
  return JSON.stringify({ changes, ambiguities, contradictions: [], unsupported, summary: `Sample interpretation: ${changes.length} change(s).` })
}
