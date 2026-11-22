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
const WORKFLOWS: Record<string, { id: string | null; name: string; file: string }> = {
  agent: { id: "w3vjp1OmemH8zG3A", name: "Psycray Research Agent v2", file: "psycray-research-agent-v2" },
  api: { id: "oRmS31cJqbOcTmQ4", name: "Psycray Research API", file: "psycray-research-api" },
  // Created 2026-11-22 by this script (id null = create on first deploy)
  icp: { id: "gGaWTj8LKazKErXE", name: "Psycray ICP API", file: "psycray-icp-api" },
}

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

/** Saves what runs (not n8n's history snapshots), plus the fields backups are compared on. */
function saveExport(file: string, wf: Record<string, any>) {
  const { id, name, active, updatedAt, nodes, connections, settings } = wf
  writeFileSync(join(root, "n8n/workflows", `${file}.json`), JSON.stringify({ id, name, active, updatedAt, nodes, connections, settings }, null, 2) + "\n")
}

async function activate(id: string) {
  await call("POST", `/workflows/${id}/activate`)
  return call("GET", `/workflows/${id}`)
}

for (const key of process.argv.slice(2)) {
  const wf = WORKFLOWS[key]
  if (!wf) throw new Error(`Unknown workflow "${key}" (use: ${Object.keys(WORKFLOWS).join(", ")})`)
  const local = JSON.parse(readFileSync(join(root, "n8n/workflows", `${wf.file}.json`), "utf8"))
  const body = { name: local.name, nodes: local.nodes, connections: local.connections, settings: local.settings }

  if (wf.id === null) {
    const existing = ((await call("GET", "/workflows?limit=250")).data as { id: string; name: string }[]).find((w) => w.name === wf.name)
    if (!existing) {
      const created = await call("POST", "/workflows", body)
      const final = await activate(created.id)
      saveExport(wf.file, final)
      console.log(`${key}: created ${final.id} (${final.nodes.length} nodes, active=${final.active})`)
      continue
    }
    wf.id = existing.id
  }

  const backups = readdirSync(join(root, "n8n/workflows/backups")).filter((f) => f.startsWith(wf.file + ".")).sort()
  const live = await call("GET", `/workflows/${wf.id}`)
  if (backups.length === 0) throw new Error(`${key}: no backup in n8n/workflows/backups. Back it up first.`)
  const backup = JSON.parse(readFileSync(join(root, "n8n/workflows/backups", backups.at(-1)!), "utf8"))
  if (live.updatedAt !== backup.updatedAt) {
    throw new Error(`${key}: live workflow changed since backup ${backups.at(-1)} (${live.updatedAt}). Back it up again first.`)
  }

  await call("PUT", `/workflows/${wf.id}`, body)
  const after = await call("GET", `/workflows/${wf.id}`)
  const final = after.active ? after : await activate(wf.id!)
  saveExport(wf.file, final)
  console.log(`${key}: deployed (${final.nodes.length} nodes, active=${final.active}, updatedAt ${final.updatedAt})`)
}
