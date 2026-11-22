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
export const ICP_WORKFLOW = join(root, "n8n/workflows/psycray-icp-api.json")

/** Every generated Code node: [workflow file, node name, builder]. */
export const GENERATED_NODES: [string, string, () => string][] = [
  [AGENT_WORKFLOW, "ICP Scoring Logic", () => scoringNodeCode()],
  [AGENT_WORKFLOW, "Apply Active ICP", () => cachedNodeCode()],
  [API_WORKFLOW, "Recalculate Score", () => rescoreNodeCode()],
  [ICP_WORKFLOW, "Rescore Saved Companies", () => rescoreAllNodeCode()],
  [ICP_WORKFLOW, "Validate ICP Config", () => validateConfigNodeCode()],
]

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

/** Shared glue: the active published config (from SQL) or the default. */
const ACTIVE_CONFIG = `
function activeConfig(row) {
  return row && row.active_config ? normalizeConfig(row.active_config) : DEFAULT_ICP_CONFIG;
}
function activeConfigId(row) {
  return row && row.active_config_id ? Number(row.active_config_id) : null;
}`

/** Agent v2 · "ICP Scoring Logic": fresh research, after "Classify ICP Evidence". */
export function scoringNodeCode(): string {
  return `${BANNER}
${engineJs()}

// ── n8n glue ──────────────────────────────────────────────────────────
${ACTIVE_CONFIG}
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
let facts = {};
try { facts = parseModelJson('Extract Core Company Facts'); } catch (e) { facts = {}; }
const loaded = $('Load Fresh Research by Domain').first().json;
const researchedAt = $now.toUTC().toISO();

const evidence = normalizeEvidence(classification, {
  domain: loaded.candidate_domain,
  researched_at: researchedAt,
  external_urls: $('Find Growth Signals').all().map((i) => i.json.url).filter(Boolean),
  unknowns: Array.isArray(synthesis.unknowns) ? synthesis.unknowns : [],
  facts_customer_types: Array.isArray(facts.customer_types) ? facts.customer_types : [],
});

const result = evaluate(evidence, {
  config: activeConfig(loaded),
  config_version_id: activeConfigId(loaded),
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

/**
 * Shared by every "rescore saved research" node: applies the active config
 * to one saved row. Returns null when there is no scoring evidence (legacy).
 */
const RESCORE_ROW = `
function rescoreRow(row, config, configId, calculatedAt) {
  const saved = row.synthesized_research && row.synthesized_research.icp_evidence;
  if (!saved) return null;
  const evidence = supplementEvidence(saved, row.company_facts);
  const previous = summarizeStored(row.icp_breakdown, row.icp_score, row.icp_tier);
  const result = evaluate(evidence, {
    config,
    config_version_id: configId,
    // Same research snapshot: rescoring never gathers new evidence.
    snapshot_id: (previous && previous.snapshot_id) || null,
    calculated_at: calculatedAt,
    previous,
  });
  return { result, evidence, previous };
}
function isCurrent(row, config) {
  const s = summarizeStored(row.icp_breakdown, row.icp_score, row.icp_tier);
  return !!s && s.config_version === config.version && s.algorithm_version === ICP_ALGORITHM_VERSION;
}`

/** Agent v2 · "Apply Active ICP": cached research is rescored when its config is outdated. */
export function cachedNodeCode(): string {
  return `${BANNER}
${engineJs()}

// ── n8n glue ──────────────────────────────────────────────────────────
${ACTIVE_CONFIG}
${RESCORE_ROW}
const row = $input.first().json;
const config = activeConfig(row);
const stored = { ...row, icp_breakdown: row.prev_icp_breakdown, icp_score: row.prev_icp_score, icp_tier: row.prev_icp_tier };
const out = isCurrent(stored, config) ? null : rescoreRow(stored, config, activeConfigId(row), $now.toUTC().toISO());

return [{
  json: {
    ...row,
    rescored: !!out,
    icp_score: out ? out.result.score : row.icp_score,
    icp_tier: out ? out.result.tier : row.icp_tier,
    icp_breakdown: out ? out.result : null,
    icp_evidence: out ? out.evidence : null,
  },
}];
`
}

/** Research API · "Recalculate Score": one company, active config, no new research. */
export function rescoreNodeCode(): string {
  return `${BANNER}
${engineJs()}

// ── n8n glue ──────────────────────────────────────────────────────────
${ACTIVE_CONFIG}
${RESCORE_ROW}
const row = $input.first().json;
if (!row.domain) {
  return [{ json: { http_status: 404, error: 'No saved research for this domain.' } }];
}
const out = rescoreRow(row, activeConfig(row), activeConfigId(row), $now.toUTC().toISO());
if (!out) {
  return [{ json: { http_status: 409, error: 'This research predates evidence-based scoring. Refresh it once to collect scoring evidence.' } }];
}
return [{ json: { http_status: 200, domain: row.domain, icp_score: out.result.score, icp_tier: out.result.tier, icp_breakdown: out.result, icp_evidence: out.evidence } }];
`
}

/** ICP API · "Rescore Saved Companies": every saved company, active config. */
export function rescoreAllNodeCode(): string {
  return `${BANNER}
${engineJs()}

// ── n8n glue ──────────────────────────────────────────────────────────
${ACTIVE_CONFIG}
${RESCORE_ROW}
const input = $input.first().json;
const config = activeConfig(input);
const configId = activeConfigId(input);
const calculatedAt = $now.toUTC().toISO();
const rows = Array.isArray(input.rows) ? input.rows : [];
const updates = [];
const summary = { config_version: config.version, rescored: 0, unchanged: 0, up_to_date: 0, needs_refresh: [], changes: [] };

for (const row of rows) {
  if (isCurrent(row, config)) { summary.up_to_date++; continue; }
  const out = rescoreRow(row, config, configId, calculatedAt);
  if (!out) { summary.needs_refresh.push(row.domain); continue; }
  updates.push({ domain: row.domain, score: out.result.score, tier: out.result.tier, result: out.result, evidence: out.evidence });
  summary.rescored++;
  if (out.previous && out.previous.score === out.result.score) summary.unchanged++;
  else summary.changes.push({ domain: row.domain, previous: out.previous ? out.previous.score : null, updated: out.result.score });
}

return [{ json: { config, config_id: configId, updates, summary } }];
`
}

/** ICP API · "Validate ICP Config": server-side check before a version is published. */
export function validateConfigNodeCode(): string {
  return `${BANNER}
${engineJs()}

// ── n8n glue ──────────────────────────────────────────────────────────
const current = $input.first().json;
const body = $('Publish ICP Request').first().json.body || {};
const fail = (http_status, error, details) => [{ json: { http_status, error, details: details || [] } }];

if (!body.config || typeof body.config !== 'object') return fail(400, 'Send the configuration to publish.');
if (Number(body.base_version_id) !== Number(current.active_version_id)) {
  return fail(409, 'Someone published a newer version while you were editing. Reload to see it, then reapply your changes.');
}
const nextVersion = Number(current.max_version) + 1;
const config = normalizeConfig({ ...body.config, version: current.slug + '-v' + nextVersion });
const errors = validateConfig(config);
if (errors.length) return fail(400, 'The configuration is not valid.', errors);

const before = normalizeConfig(current.active_config);
const changes = describeConfigChanges(before, config);
if (changes.length === 0) return fail(400, 'Nothing changed: this matches the published version.');

return [{
  json: {
    http_status: 201,
    profile_id: current.profile_id,
    version: nextVersion,
    label: config.version,
    config,
    note: String(body.note || '').slice(0, 500),
    change_summary: changes,
    published_by: $('Authorize Admin').first().json.admin_name,
  },
}];
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
  for (const [file, node, build] of GENERATED_NODES) patch(file, node, build())
}
