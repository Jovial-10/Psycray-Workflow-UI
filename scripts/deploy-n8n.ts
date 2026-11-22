/**
 * Deploys the repo's workflow exports to the live n8n instance.
 *
 *   node scripts/deploy-n8n.ts agent api
 *
 * For each workflow: refuses if the live version changed since the last
 * backup in n8n/workflows/backups/, PUTs name/nodes/connections/settings,
 * checks it is still active, then writes the live version back to the repo.
 * Reads N8N_API_KEY and N8N_WEBHOOK_BASE from .env.local and never prints them.
 * Live workflows are production: run only with the owner's go-ahead.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const WORKFLOWS = {
  agent: { id: "w3vjp1OmemH8zG3A", file: "psycray-research-agent-v2" },
  api: { id: "oRmS31cJqbOcTmQ4", file: "psycray-research-api" },
} as const

function env(name: string): string {
  const line = readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${name}=`))
  const value = line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "")
  if (!value) throw new Error(`${name} is missing from .env.local`)
  return value
}

const host = env("N8N_WEBHOOK_BASE").replace(/\/webhook\/.*$/, "")
const headers = { "X-N8N-API-KEY": env("N8N_API_KEY"), "Content-Type": "application/json" }

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${host}/api/v1${path}`, { method, headers, body: body && JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json() as Promise<Record<string, any>>
}

for (const key of process.argv.slice(2) as (keyof typeof WORKFLOWS)[]) {
  const wf = WORKFLOWS[key]
  if (!wf) throw new Error(`Unknown workflow "${key}" (use: ${Object.keys(WORKFLOWS).join(", ")})`)
  const backups = readdirSync(join(root, "n8n/workflows/backups")).filter((f) => f.startsWith(wf.file + ".")).sort()
  const backup = JSON.parse(readFileSync(join(root, "n8n/workflows/backups", backups.at(-1)!), "utf8"))

  const live = await call("GET", `/workflows/${wf.id}`)
  if (live.updatedAt !== backup.updatedAt) {
    throw new Error(`${key}: live workflow changed since backup ${backups.at(-1)} (${live.updatedAt}). Back it up again first.`)
  }

  const local = JSON.parse(readFileSync(join(root, "n8n/workflows", `${wf.file}.json`), "utf8"))
  await call("PUT", `/workflows/${wf.id}`, {
    name: local.name,
    nodes: local.nodes,
    connections: local.connections,
    settings: local.settings,
  })
  const after = await call("GET", `/workflows/${wf.id}`)
  if (!after.active) await call("POST", `/workflows/${wf.id}/activate`)
  const final = after.active ? after : await call("GET", `/workflows/${wf.id}`)
  writeFileSync(join(root, "n8n/workflows", `${wf.file}.json`), JSON.stringify(final, null, 2) + "\n")
  console.log(`${key}: deployed (${final.nodes.length} nodes, active=${final.active}, updatedAt ${final.updatedAt})`)
}
