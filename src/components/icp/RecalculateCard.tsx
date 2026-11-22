import { useState } from "react"
import { Calculator } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { companyPath } from "@/lib/companies"
import { api } from "@/services/api"
import type { RescoreAllSummary } from "@/types/research"

interface Props {
  publishedLabel: string
  /** Companies with evidence whose saved score uses another version. */
  outdated: number
  /** Companies without evidence (need one research refresh). */
  legacy: number
  adminKey: string | null
  onSignIn: () => void
  /** Called after a successful run, so lists reload. */
  onDone: () => void
}

/** Rescore every saved company with the published version, from saved evidence. */
export function RecalculateCard({ publishedLabel, outdated, legacy, adminKey, onSignIn, onDone }: Props) {
  const [state, setState] = useState<{ status: "idle" | "running" | "done" | "error"; summary?: RescoreAllSummary; error?: string }>({ status: "idle" })

  async function run() {
    if (!adminKey || state.status === "running") return
    setState({ status: "running" })
    try {
      const summary = await api.rescoreAll(adminKey)
      setState({ status: "done", summary })
      onDone()
    } catch (err) {
      setState({ status: "error", error: err instanceof Error ? err.message : "Recalculation failed." })
    }
  }

  const s = state.summary
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recalculate saved companies</CardTitle>
        <CardDescription>
          Applies the published version (<span className="font-mono text-xs">{publishedLabel}</span>), not your draft, to
          saved evidence. No new research, no AI calls.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm tabular-nums">
          {outdated === 0 ? "Every saved score already uses this version." : `${outdated} saved ${outdated === 1 ? "score uses" : "scores use"} an older version.`}
          {legacy > 0 && <span className="text-muted-foreground"> {legacy} need a research refresh first.</span>}
        </p>
        {adminKey ? (
          <Button variant="outline" size="sm" onClick={run} disabled={state.status === "running"}>
            <Calculator className={state.status === "running" ? "animate-pulse" : undefined} />
            {state.status === "running" ? "Recalculating…" : "Recalculate saved companies"}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onSignIn}>
            Sign in as admin to recalculate
          </Button>
        )}

        {state.status === "error" && (
          <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-xs text-danger-foreground">
            {state.error}
          </p>
        )}
        {s && (
          <div role="status" className="space-y-2 rounded-md border bg-muted/40 px-3 py-2.5 text-xs">
            <p className="tabular-nums">
              Rescored {s.rescored} · {s.changes.length} changed · {s.unchanged} unchanged · {s.up_to_date} already current
            </p>
            {s.changes.length > 0 && (
              <ul className="space-y-0.5 tabular-nums">
                {s.changes.map((c) => (
                  <li key={c.domain} className="flex justify-between gap-3">
                    <Link to={companyPath(c.domain)} className="truncate font-mono underline decoration-border underline-offset-2 hover:decoration-foreground">
                      {c.domain}
                    </Link>
                    <span>
                      {c.previous ?? "—"} → {c.updated}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {s.needs_refresh.length > 0 && (
              <p className="text-muted-foreground">
                Skipped {s.needs_refresh.length} without scoring evidence; refresh their research to include them.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
