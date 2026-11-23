import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react"
import { FitBadge } from "@/components/research/FitBadge"
import { QualificationBadge } from "@/components/research/QualificationBadge"
import type { IcpScoreResult } from "@/lib/scoring/icpEngine"
import { SIDE, TREND_INK, trend, type Trend } from "@/lib/compare"
import { cn } from "@/lib/utils"
import { SideLabel } from "@/components/common/SideLabel"
import { ChangeText, ChangeValue } from "@/components/common/ChangeValue"

interface Props {
  before: IcpScoreResult
  /** Null while the "after" configuration is invalid. */
  after: IcpScoreResult | null
  beforeLabel: string
  afterLabel: string
  /** Small line under the "before" score, e.g. the version label. */
  beforeSub: string
  /** False when nothing differs yet (shows `idleText` instead of causes). */
  dirty: boolean
  causesTitle: string
  idleText: string
  invalidText: string
  /** Also list the evidence the company is missing. */
  showMissing?: boolean
  /** Set the "before" line in mono (it's an identifier such as a version label). Default true. */
  beforeSubMono?: boolean
}

/**
 * The same company scored two ways (same evidence, two configurations):
 * scores and tiers, why they differ, per-criterion points, requirement
 * changes. Every number comes from the scoring engine.
 */
export function ScoreComparison({
  before,
  after,
  beforeLabel,
  afterLabel,
  beforeSub,
  dirty,
  causesTitle,
  idleText,
  invalidText,
  showMissing,
  beforeSubMono = true,
}: Props) {
  return (
    <>
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2" aria-live="polite">
      <Score side="before" label={beforeLabel} sub={beforeSub} mono={beforeSubMono} score={before.score} tier={before.tier} />
      <ArrowRight aria-hidden className="size-4 self-center text-muted-foreground" />
      {after ? (
        <Score side="after" label={afterLabel} sub={delta(after.score - before.score)} subTrend={trend(before.score, after.score)} score={after.score} tier={after.tier} />
      ) : (
        <p className="flex items-center rounded-lg border border-dashed border-after-border p-3 text-xs text-muted-foreground">{invalidText}</p>
      )}
    </div>

    {after && (
      <>
        <p className="text-xs text-muted-foreground tabular-nums">
          Supported by evidence: {after.score}. Up to {after.max_possible} if the{" "}
          {after.coverage < 100 ? `${100 - after.coverage}% of weight that's unknown` : "unknowns"} turned out
          fully met. Evidence covers {after.coverage}% of the weight.
        </p>

        <div className="space-y-1.5">
          <p className="text-xs font-medium">{causesTitle}</p>
          {!dirty ? (
            <p className="text-xs text-muted-foreground">{idleText}</p>
          ) : (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {(after.change?.details ?? [])
                .filter((d) => d.kind !== "unchanged" && !d.text.startsWith("ICP configuration changed"))
                .map((d) => (
                  <li key={d.text}>
                    <ChangeText text={d.text} />
                  </li>
                ))}
              {(after.change?.details ?? []).every((d) => d.kind === "unchanged" || d.text.startsWith("ICP configuration changed")) && (
                <li>These changes don't affect this company.</li>
              )}
            </ul>
          )}
        </div>

        <table className="w-full border-separate border-spacing-x-1 border-spacing-y-0 text-xs tabular-nums">
          <caption className="sr-only">Criterion points, {beforeLabel.toLowerCase()} and {afterLabel.toLowerCase()}</caption>
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="pb-1.5 text-left font-normal">Criterion</th>
              <th scope="col" className={cn("rounded-t-md px-2 pt-1.5 pb-1.5 text-right font-normal whitespace-nowrap", SIDE.before.cell)}>
                <SideLabel side="before">{beforeLabel}</SideLabel>
              </th>
              <th scope="col" className={cn("rounded-t-md px-2 pt-1.5 pb-1.5 text-right font-normal whitespace-nowrap", SIDE.after.cell)}>
                <SideLabel side="after">{afterLabel}</SideLabel>
              </th>
            </tr>
          </thead>
          <tbody>
            {after.criteria.map((c) => {
              const prev = before.criteria.find((p) => p.key === c.key)!
              const changed = prev.score !== c.score
              return (
                <tr key={c.key} className="border-t">
                  <th scope="row" className="py-1.5 text-left font-normal">
                    {c.criterion}
                    {c.status === "unknown" && <span className="text-muted-foreground italic"> · unknown</span>}
                  </th>
                  <td className={cn("px-2 py-1.5 text-right whitespace-nowrap", SIDE.before.cell, SIDE.before.ink)}>
                    {prev.score} / {prev.max}
                  </td>
                  <td className={cn("px-2 py-1.5 text-right whitespace-nowrap", SIDE.after.cell)}>
                    {changed ? (
                      <ChangeValue before={prev.score} after={c.score}>
                        {c.score} / {c.max}
                      </ChangeValue>
                    ) : (
                      <>
                        {c.score} / {c.max}
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            <tr className="border-t">
              <th scope="row" className="py-1.5 text-left font-normal">Baseline</th>
              <td className={cn("rounded-b-md px-2 py-1.5 text-right whitespace-nowrap", SIDE.before.cell, SIDE.before.ink)}>{before.baseline}</td>
              <td className={cn("rounded-b-md px-2 py-1.5 text-right whitespace-nowrap", SIDE.after.cell)}>
                <ChangeValue before={before.baseline} after={after.baseline}>{after.baseline}</ChangeValue>
              </td>
            </tr>
          </tbody>
        </table>

        {after.requirements.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">Hard requirements</p>
              <QualificationBadge qualification={after.qualification} />
            </div>
            <ul className="space-y-1 text-xs">
              {after.requirements.map((r) => (
                <li key={r.key} className="flex justify-between gap-3">
                  <span>
                    {r.requirement}
                    {(() => {
                      const was = before.requirements.find((b) => b.key === r.key)
                      return was && was.status !== r.status ? <span className="text-muted-foreground"> (was {was.status})</span> : !was ? <span className="text-muted-foreground"> (new)</span> : null
                    })()}
                  </span>
                  <span className={cn("shrink-0", r.status === "fail" ? "text-danger-foreground" : "text-muted-foreground", r.status === "unknown" && "italic")}>
                    {r.status === "pass" ? "Pass" : r.status === "fail" ? "Fail" : "Unknown"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    )}
      {after && showMissing && after.missing.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Missing evidence</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
            {after.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function Score({
  side,
  label,
  sub,
  score,
  tier,
  mono,
  subTrend = "same",
}: {
  side: keyof typeof SIDE
  subTrend?: Trend
  label: string
  sub: string
  score: number
  tier: Parameters<typeof FitBadge>[0]["tier"]
  mono?: boolean
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5 rounded-lg border p-3", SIDE[side].tile)}>
      <SideLabel side={side}>{label}</SideLabel>
      <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", SIDE[side].ink)}>{score}</p>
      <FitBadge tier={tier} />
      <p className={cn("flex items-center gap-0.5 truncate text-xs text-muted-foreground tabular-nums", mono && "font-mono", subTrend !== "same" && cn("font-medium", TREND_INK[subTrend]))} title={sub}>
        {subTrend === "up" && <ArrowUp aria-hidden className="size-3 shrink-0" />}
        {subTrend === "down" && <ArrowDown aria-hidden className="size-3 shrink-0" />}
        {sub}
      </p>
    </div>
  )
}

function delta(n: number) {
  return n === 0 ? "no change" : `${n > 0 ? "+" : ""}${n} points`
}
