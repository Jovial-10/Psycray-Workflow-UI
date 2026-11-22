import { ArrowRight } from "lucide-react"
import { FitBadge } from "@/components/research/FitBadge"
import { QualificationBadge } from "@/components/research/QualificationBadge"
import type { IcpScoreResult } from "@/lib/scoring/icpEngine"
import { cn } from "@/lib/utils"

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
    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3" aria-live="polite">
      <Score label={beforeLabel} sub={beforeSub} mono={beforeSubMono} score={before.score} tier={before.tier} />
      <ArrowRight aria-hidden className="mb-3 size-4 text-muted-foreground" />
      {after ? (
        <Score
          label={afterLabel}
          sub={delta(after.score - before.score)}
          score={after.score}
          tier={after.tier}
          emphasis
        />
      ) : (
        <p className="pb-2 text-xs text-muted-foreground">{invalidText}</p>
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
                  <li key={d.text}>{d.text}</li>
                ))}
              {(after.change?.details ?? []).every((d) => d.kind === "unchanged" || d.text.startsWith("ICP configuration changed")) && (
                <li>These changes don't affect this company.</li>
              )}
            </ul>
          )}
        </div>

        <table className="w-full text-xs tabular-nums">
          <caption className="sr-only">Criterion points, {beforeLabel.toLowerCase()} and {afterLabel.toLowerCase()}</caption>
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="pb-1 text-left font-normal">Criterion</th>
              <th scope="col" className="pb-1 text-right font-normal">{beforeLabel}</th>
              <th scope="col" className="pb-1 text-right font-normal">{afterLabel}</th>
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
                  <td className="py-1.5 text-right text-muted-foreground">
                    {prev.score} / {prev.max}
                  </td>
                  <td className={cn("py-1.5 text-right", changed && "font-medium")}>
                    {c.score} / {c.max}
                  </td>
                </tr>
              )
            })}
            <tr className="border-t">
              <th scope="row" className="py-1.5 text-left font-normal">Baseline</th>
              <td className="py-1.5 text-right text-muted-foreground">{before.baseline}</td>
              <td className={cn("py-1.5 text-right", after.baseline !== before.baseline && "font-medium")}>
                {after.baseline}
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
  label,
  sub,
  score,
  tier,
  emphasis,
  mono,
}: {
  label: string
  sub: string
  score: number
  tier: Parameters<typeof FitBadge>[0]["tier"]
  emphasis?: boolean
  mono?: boolean
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", !emphasis && "text-muted-foreground")}>{score}</p>
      <FitBadge tier={tier} />
      <p className={cn("truncate text-xs text-muted-foreground tabular-nums", mono && "font-mono")} title={sub}>
        {sub}
      </p>
    </div>
  )
}

function delta(n: number) {
  return n === 0 ? "no change" : `${n > 0 ? "+" : ""}${n} points`
}
