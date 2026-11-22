/**
 * Runs an n8n Code-node body outside n8n, with stubbed `$`, `$input`,
 * `$json`, `$now` and `$execution`, the globals our nodes use.
 */
type Item = { json: Record<string, unknown> }

export interface FakeN8n {
  nodes: Record<string, Item[]>
  input?: Item[]
  json?: Record<string, unknown>
  now?: string
  executionId?: string
}

export function runCodeNode(code: string, ctx: FakeN8n): Item[] {
  const $ = (name: string) => {
    const items = ctx.nodes[name]
    if (!items) throw new Error(`Node "${name}" was not stubbed`)
    return { first: () => items[0], all: () => items, isExecuted: true }
  }
  const input = ctx.input ?? []
  const $input = { first: () => input[0], all: () => input }
  const iso = ctx.now ?? "2026-11-21T00:00:00.000Z"
  const $now = { toISO: () => iso, toUTC: () => ({ toISO: () => iso }) }
  const fn = new Function("$", "$input", "$json", "$now", "$execution", code) as (...args: unknown[]) => Item[]
  return fn($, $input, ctx.json ?? input[0]?.json ?? {}, $now, { id: ctx.executionId ?? "test" })
}

/** Wraps text the way n8n's OpenAI node returns it. */
export const modelOutput = (value: unknown): Item => ({
  json: { output: [{ content: [{ text: typeof value === "string" ? value : JSON.stringify(value) }] }] },
})
