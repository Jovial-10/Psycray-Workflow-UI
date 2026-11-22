/**
 * Builds the n8n Code-node source for ICP scoring from the one engine file
 * (src/lib/scoring/icpEngine.ts), and writes it into the workflow exports.
 *
 *   npm run sync:n8n     → updates n8n/workflows/*.json in place
 *
 * The tests compare the workflow files against these builders, so the code
 * that runs in n8n can never drift from the code that is tested.
 * Deploying the updated JSON to the live n8n instance is a separate step
 * (scripts/deploy-n8n.ts) that needs the user's go-ahead.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
export const ENGINE_PATH = join(root, "src/lib/scoring/icpEngine.ts")
export const AGENT_WORKFLOW = join(root, "n8n/workflows/psycray-research-agent-v2.json")
export const API_WORKFLOW = join(root, "n8n/workflows/psycray-research-api.json")

const BANNER = "// ── GENERATED from src/lib/scoring/icpEngine.ts by `npm run sync:n8n`. Do not edit in n8n. ──"

/** The engine as plain JavaScript with no `export` keywords. */
export function engineJs(): string {
  const js = stripTypeScriptTypes(readFileSync(ENGINE_PATH, "utf8"), { mode: "strip" })
  return js
    .replace(/^export\s+(?=(const|function|let|class)\b)/gm, "")
    .replace(/^export\s+(type|interface)\b[^\n]*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Agent v2 · "ICP Scoring Logic": runs after "Classify ICP Evidence". */
export function scoringNodeCode(): string {
  return `${BANNER}
${engineJs()}

// ── n8n glue ──────────────────────────────────────────────────────────
function parseModelJson(node) {
  const text = $(node).first().json.output?.[0]?.content?.[0]?.text || '';
  const cleaned = text.replace(/\`\`\`json\\s?|\`\`\`/g, '').trim();
  try {
    return JSON.parse(cleaned.substring(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
  } catch (error) {
    // Fail the run (the error workflow marks the job failed) instead of
    // saving an empty score over the existing research.
    throw new Error(node + ' did not return valid JSON');
  }
}

const synthesis = parseModelJson('Synthesize Intelligence & Evidence');
const classification = parseModelJson('Classify ICP Evidence');
const loaded = $('Load Fresh Research by Domain').first().json;
const researchedAt = $now.toUTC().toISO();

const evidence = normalizeEvidence(classification, {
  domain: loaded.candidate_domain,
  researched_at: researchedAt,
  external_urls: $('Find Growth Signals').all().map((i) => i.json.url).filter(Boolean),
  unknowns: Array.isArray(synthesis.unknowns) ? synthesis.unknowns : [],
});

const result = evaluate(evidence, {
  config: DEFAULT_ICP_CONFIG,
  snapshot_id: 'exec-' + $execution.id,
  calculated_at: researchedAt,
  previous: summarizeStored(loaded.prev_icp_breakdown, loaded.prev_icp_score, loaded.prev_icp_tier),
});

return [{
  json: {
    ...$json,
    icp_score: result.score,
    icp_tier: result.tier,
    scoring_rationale: result.criteria.map((c) => c.criterion + ': ' + c.reason + ' (' + c.score + '/' + c.max + ')'),
    icp_breakdown: result,
    icp_evidence: evidence,
    score_trigger: loaded.prev_icp_score === null || loaded.prev_icp_score === undefined ? 'research' : 'refresh',
    parsed_synthesis: { ...synthesis, icp_evidence: evidence },
  },
}];
`
}

/** Research API · "Recalculate Score": rescoring saved evidence, no new research. */
export function rescoreNodeCode(): string {
  return `${BANNER}
${engineJs()}

// ── n8n glue ──────────────────────────────────────────────────────────
const row = $input.first().json;
if (!row.domain) {
  return [{ json: { http_status: 404, error: 'No saved research for this domain.' } }];
}
const evidence = row.synthesized_research && row.synthesized_research.icp_evidence;
if (!evidence) {
  return [{ json: { http_status: 409, error: 'This research predates evidence-based scoring. Refresh it once to collect scoring evidence.' } }];
}

const previous = summarizeStored(row.icp_breakdown, row.icp_score, row.icp_tier);
const result = evaluate(evidence, {
  config: DEFAULT_ICP_CONFIG,
  // Same research snapshot: recalculation never gathers new evidence.
  snapshot_id: (previous && previous.snapshot_id) || null,
  calculated_at: $now.toUTC().toISO(),
  previous,
});

return [{ json: { http_status: 200, domain: row.domain, icp_score: result.score, icp_tier: result.tier, icp_breakdown: result, icp_evidence: evidence } }];
`
}

interface WorkflowFile {
  nodes: { name: string; parameters: Record<string, unknown> }[]
}

export function nodeCode(workflowPath: string, nodeName: string): string | undefined {
  const wf = JSON.parse(readFileSync(workflowPath, "utf8")) as WorkflowFile
  return wf.nodes.find((n) => n.name === nodeName)?.parameters.jsCode as string | undefined
}

function patch(workflowPath: string, nodeName: string, code: string) {
  const wf = JSON.parse(readFileSync(workflowPath, "utf8")) as WorkflowFile
  const node = wf.nodes.find((n) => n.name === nodeName)
  if (!node) throw new Error(`${nodeName} not found in ${workflowPath}`)
  node.parameters.jsCode = code
  writeFileSync(workflowPath, JSON.stringify(wf, null, 2) + "\n")
  console.log(`updated ${nodeName} in ${workflowPath.slice(root.length + 1)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patch(AGENT_WORKFLOW, "ICP Scoring Logic", scoringNodeCode())
  patch(API_WORKFLOW, "Recalculate Score", rescoreNodeCode())
}
