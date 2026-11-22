import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/services/api"
import type { ScoreHistoryEntry } from "@/types/research"

const TRIGGER: Record<ScoreHistoryEntry["trigger"], string> = {
  research: "Researched",
  refresh: "Research refreshed",
  recalculate: "Recalculated",
}

/** Every score this company has had, with the ICP version behind it. */
export function ScoreHistory({ domain, refreshKey }: { domain: string; refreshKey?: unknown }) {
  const [state, setState] = useState<{ domain: string; entries: ScoreHistoryEntry[] | null; error: string | null }>({
    domain,
    entries: null,
    error: null,
  })

  useEffect(() => {
    let current = true
    api.getScoreHistory(domain).then(
      (entries) => current && setState({ domain, entries, error: null }),
      (err: unknown) => current && setState({ domain, entries: null, error: err instanceof Error ? err.message : "History couldn't load." }),
    )
    return () => {
      current = false
    }
  }, [domain, refreshKey])

  const entries = state.domain === domain ? state.entries : null
  if (state.domain === domain && state.error) return null
  if (entries && entries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score history</CardTitle>
        <CardDescription>Each score keeps the ICP version it was calculated with.</CardDescription>
      </CardHeader>
      <CardContent>
        {!entries ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ol className="divide-y text-sm">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0">
                <span>
                  <span className="font-medium tabular-nums">{e.score ?? "—"}</span>
                  <span className="text-muted-foreground"> · {TRIGGER[e.trigger]}</span>
                  {e.change?.delta ? (
                    <span className="text-muted-foreground tabular-nums"> ({e.change.delta > 0 ? "+" : ""}{e.change.delta})</span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="font-mono">{e.config_version ?? "unknown"}</span> ·{" "}
                  {new Date(e.calculated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
