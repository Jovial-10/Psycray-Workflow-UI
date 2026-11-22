import { useState } from "react"
import { Lock, LockOpen, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CRITERIA, type CriterionKey, type CriterionResult, type IcpConfig } from "@/lib/scoring/icpEngine"
import { redistribute, totalWeight } from "@/lib/scoring/weights"
import { cn } from "@/lib/utils"
import { NumberField, Section } from "./fields"

interface WeightsCardProps {
  draft: IcpConfig
  onChange: (next: IcpConfig) => void
  /** The preview company's criteria under the draft, for "this company earns" figures. */
  previewCriteria: CriterionResult[] | null
  previewName: string | null
}

/** Weights (must total 100%) and the baseline, with their score contribution. */
export function WeightsCard({ draft, onChange, previewCriteria, previewName }: WeightsCardProps) {
  const [locked, setLocked] = useState<Set<CriterionKey>>(new Set())
  const [lastEdited, setLastEdited] = useState<CriterionKey | null>(null)
  const total = totalWeight(draft.weights)
  const span = 100 - draft.baseline

  const setWeight = (key: CriterionKey, value: number | null) => {
    setLastEdited(key)
    onChange({ ...draft, weights: { ...draft.weights, [key]: value === null ? 0 : value } })
  }
  const toggleLock = (key: CriterionKey) =>
    setLocked((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // Proposal to bring the total back to 100%, keeping the last edited weight
  const anchor = lastEdited ?? CRITERIA[0].key
  const proposal = total !== 100 ? redistribute(draft.weights, anchor, draft.weights[anchor], locked) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weights and baseline</CardTitle>
        <CardDescription>How much each criterion counts. Weights must total exactly 100%.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-5">
          {CRITERIA.map(({ key, label, description }) => {
            const w = draft.weights[key]
            const isLocked = locked.has(key)
            const earned = previewCriteria?.find((c) => c.key === key)
            const invalid = !Number.isInteger(w) || w < 0 || w > 100
            return (
              <li key={key} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-1.5 self-start">
                  <NumberField
                    label={`${label} weight`}
                    value={w}
                    min={0}
                    max={100}
                    suffix="%"
                    invalid={invalid}
                    onChange={(v) => setWeight(key, v)}
                    className="w-20"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-pressed={isLocked}
                        aria-label={isLocked ? `Unlock ${label}` : `Lock ${label}`}
                        onClick={() => toggleLock(key)}
                        className={cn(!isLocked && "text-muted-foreground")}
                      >
                        {isLocked ? <Lock /> : <LockOpen />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isLocked ? "Locked: rebalancing won't change it" : "Lock so rebalancing leaves it alone"}</TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  aria-label={`${label} weight`}
                  value={[Math.max(0, Math.min(100, w))]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) => setWeight(key, v)}
                  className="col-span-2"
                />
                <p className="col-span-2 flex flex-wrap justify-between gap-x-4 text-xs text-muted-foreground tabular-nums">
                  <span>Worth up to {Math.round((span * w) / 10) / 10} points</span>
                  {earned && previewName && (
                    <span>
                      {previewName}: {earned.status === "unknown" ? "unknown" : `${earned.score} pts`}
                    </span>
                  )}
                </p>
              </li>
            )
          })}
        </ul>

        <div className="space-y-2 rounded-lg border bg-muted/40 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">Total</span>
            <span className={cn("font-medium tabular-nums", total === 100 ? "text-foreground" : "text-danger-foreground")}>
              {total}% {total === 100 ? "" : `(${total > 100 ? "over" : "under"} by ${Math.abs(total - 100)}%)`}
            </span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            {CRITERIA.map(({ key }, i) => (
              <div
                key={key}
                className={cn("h-full", i % 2 ? "bg-foreground/50" : "bg-foreground/80", total > 100 && "bg-danger")}
                style={{ width: `${(Math.max(0, draft.weights[key]) / Math.max(100, total)) * 100}%` }}
              />
            ))}
          </div>
          {proposal && (
            <div className="space-y-2 pt-1 text-xs">
              {"error" in proposal ? (
                <p className="text-muted-foreground">{proposal.error}</p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Rebalance keeps {CRITERIA.find((c) => c.key === anchor)!.label} at {draft.weights[anchor]}%
                    {locked.size > 0 && " and locked weights as they are"}, and scales the others in proportion:
                  </p>
                  <ul className="space-y-0.5 tabular-nums">
                    {proposal.changes
                      .filter((c) => !c.startsWith(CRITERIA.find((x) => x.key === anchor)!.label + " "))
                      .map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                  </ul>
                  <Button size="xs" variant="outline" onClick={() => onChange({ ...draft, weights: proposal.weights })}>
                    <Scale />
                    Apply rebalance
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <Section
          title="Baseline score"
          description={
            <>
              Every company starts here; criteria fill the remaining {span} points. Score = baseline + ({span}) ×
              weighted fit, so it never exceeds 100 and the baseline is never counted twice. A baseline change moves
              every company's score and is recorded as a configuration change, not new evidence.
            </>
          }
        >
          <div className="flex items-center gap-4">
            <Slider
              aria-label="Baseline score"
              value={[Math.max(0, Math.min(90, draft.baseline))]}
              min={0}
              max={90}
              step={1}
              onValueChange={([v]) => onChange({ ...draft, baseline: v })}
            />
            <NumberField
              label="Baseline score"
              value={draft.baseline}
              min={0}
              max={90}
              invalid={!Number.isInteger(draft.baseline) || draft.baseline < 0 || draft.baseline > 90}
              onChange={(v) => onChange({ ...draft, baseline: v ?? 0 })}
              className="w-20 shrink-0"
            />
          </div>
        </Section>
      </CardContent>
    </Card>
  )
}
