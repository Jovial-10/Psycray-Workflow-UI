import { useState } from "react"
import { Check, PencilLine, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { previewCompany } from "@/lib/icpStudio"
import { INSTRUCTION_MAX, type Proposal } from "@/lib/scoring/icpAssistant"
import { CRITERIA, validateConfig, type CriterionKey, type IcpConfig, type SizeBand } from "@/lib/scoring/icpEngine"
import { totalWeight } from "@/lib/scoring/weights"
import { cn } from "@/lib/utils"
import { api, ApiError } from "@/services/api"
import type { CompanyResearchRecord } from "@/types/research"
import { NumberField } from "./fields"
import { SideLabel } from "@/components/common/SideLabel"
import { SIDE } from "@/lib/compare"
import { ScoreComparison } from "./ScoreComparison"

const EXAMPLES = [
  "Focus on SaaS companies with 10–50 employees and increase digital opportunity to 40%.",
  "Make company size less important and prioritize growth signals.",
  "Only qualify U.S.-based B2B organizations with at least 20 employees.",
]

interface Props {
  /** The draft the instruction is read against (may have unsaved changes). */
  draft: IcpConfig
  /** Replaces the draft. Never publishes. */
  onApply: (config: IcpConfig) => void
  companies: CompanyResearchRecord[]
  selectedDomain: string | null
  onSelectCompany: (domain: string) => void
  sampleMode: boolean
}

type Status = { kind: "idle" } | { kind: "pending" } | { kind: "error"; message: string }

/**
 * "Describe Your Ideal Customer": the AI reads an instruction and proposes
 * changes; the user reviews, optionally edits, then applies them to the draft.
 * Publishing stays a separate step in the Studio header.
 */
export function AssistantPanel({ draft, onApply, companies, selectedDomain, onSelectCompany, sampleMode }: Props) {
  const [instruction, setInstruction] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const [proposal, setProposal] = useState<{ basedOn: IcpConfig; data: Proposal } | null>(null)
  const [useRebalance, setUseRebalance] = useState(false)
  const [editing, setEditing] = useState(false)
  const [edits, setEdits] = useState<{ weights: Partial<Record<CriterionKey, number>>; baseline: number | null }>({ weights: {}, baseline: null })

  const tooLong = instruction.length > INSTRUCTION_MAX

  async function interpret() {
    if (status.kind === "pending" || !instruction.trim() || tooLong) return
    setStatus({ kind: "pending" })
    try {
      const data = await api.interpretIcp(instruction, draft)
      setProposal({ basedOn: draft, data })
      setUseRebalance(false)
      setEditing(false)
      setEdits({ weights: {}, baseline: null })
      setStatus({ kind: "idle" })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "The assistant couldn't be reached. Check your connection and try again."
      setStatus({ kind: "error", message })
    }
  }

  function discard() {
    setProposal(null)
    setEditing(false)
    setEdits({ weights: {}, baseline: null })
  }

  // The configuration that "Apply" would use: requested or rebalanced, plus manual edits
  const p = proposal?.data
  const base = p ? (useRebalance && p.rebalance && "config" in p.rebalance ? p.rebalance.config : p.requested) : null
  const final: IcpConfig | null = base
    ? {
        ...base,
        weights: { ...base.weights, ...Object.fromEntries(Object.entries(edits.weights).map(([k, v]) => [k, v ?? 0])) } as IcpConfig["weights"],
        baseline: edits.baseline ?? base.baseline,
      }
    : null
  const finalErrors = final ? validateConfig(final) : []
  const finalTotal = final ? totalWeight(final.weights) : 100
  const current = proposal?.basedOn ?? draft
  const stale = !!proposal && proposal.basedOn !== draft

  // Simulation: the same saved company under the current draft and the proposal
  const record = companies.find((c) => c.domain === selectedDomain) ?? companies[0] ?? null
  const currentValid = validateConfig(current).length === 0
  const simulation = record && final && currentValid ? previewCompany(record, current, 0, final) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Describe your ideal customer</CardTitle>
        <CardDescription>
          Say what to change in plain words. The assistant proposes changes to your draft; nothing is applied until you
          review it, and nothing is published until you click Publish.
          {sampleMode && " Sample mode uses a simple stand-in that only understands short instructions."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            void interpret()
          }}
        >
          <Label htmlFor="icp-instruction" className="sr-only">
            Instruction
          </Label>
          <Textarea
            id="icp-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void interpret()
            }}
            placeholder="e.g. Prioritize manufacturers with system integration needs and set the baseline to 10."
            aria-invalid={tooLong || undefined}
            aria-describedby="icp-instruction-help"
            className="min-h-20 md:text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id="icp-instruction-help" className={cn("text-xs tabular-nums", tooLong ? "text-danger-foreground" : "text-muted-foreground")}>
              {instruction.length} / {INSTRUCTION_MAX}
              <span className="hidden sm:inline"> · ⌘/Ctrl + Enter to send</span>
            </p>
            <Button type="submit" variant="outline" size="sm" disabled={status.kind === "pending" || !instruction.trim() || tooLong}>
              {status.kind === "pending" ? "Reading your instruction…" : "Propose changes"}
            </Button>
          </div>
          {!proposal && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Example instructions">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => setInstruction(ex)}
                    className="rounded-full border bg-card px-2.5 py-1 text-left text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        {status.kind === "error" && (
          <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-xs text-danger-foreground">
            {status.message}
          </p>
        )}

        {p && final && (
          <section aria-label="Proposed changes" className="space-y-4 rounded-lg border bg-muted/30 p-4">
            {p.summary && <p className="text-sm">{p.summary}</p>}
            {p.changes.length === 0 && Object.keys(edits.weights).length === 0 && edits.baseline === null && (
              <p className="text-sm text-muted-foreground">No changes: your draft already matches this instruction.</p>
            )}
            {stale && (
              <p className="text-xs text-muted-foreground">
                The draft changed after this proposal was made. Applying replaces the draft with this proposal.
              </p>
            )}

            <Notes title="Please confirm" items={p.warnings} />
            <Notes title="Contradictions" items={p.contradictions} tone="warning" />
            <Notes title="Not supported (left out)" items={p.unsupported} />
            {p.rejected.length > 0 && (
              <Notes title={`Ignored ${p.rejected.length} invalid suggestion${p.rejected.length === 1 ? "" : "s"} from the assistant`} items={p.rejected} />
            )}

            {/* Weights and baseline: current → proposed */}
            <table className="w-full border-separate border-spacing-x-1 border-spacing-y-0 text-sm tabular-nums">
              <caption className="sr-only">Weights and baseline, current and proposed</caption>
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-1.5 text-left font-normal">Setting</th>
                  <th scope="col" className={cn("rounded-t-md px-2.5 pt-1.5 pb-1.5 text-right font-normal", SIDE.before.cell)}>
                    <SideLabel side="before">Current</SideLabel>
                  </th>
                  <th scope="col" className={cn("rounded-t-md px-2.5 pt-1.5 pb-1.5 text-right font-normal", SIDE.after.cell)}>
                    <SideLabel side="after">Proposed</SideLabel>
                  </th>
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map(({ key, label }) => {
                  const now = current.weights[key]
                  const next = final.weights[key]
                  return (
                    <tr key={key} className="border-t">
                      <th scope="row" className="py-1.5 text-left font-normal">{label}</th>
                      <td className={cn("px-2.5 py-1.5 text-right", SIDE.before.cell, SIDE.before.ink)}>{now}%</td>
                      <td className={cn("px-2.5 py-1.5 text-right", SIDE.after.cell, next !== now && cn("font-semibold", SIDE.after.ink))}>
                        {editing ? (
                          <NumberField
                            label={`Proposed ${label} weight`}
                            value={next}
                            min={0}
                            max={100}
                            suffix="%"
                            onChange={(v) => setEdits((e) => ({ ...e, weights: { ...e.weights, [key]: v ?? 0 } }))}
                            className="ml-auto w-20"
                          />
                        ) : (
                          `${next}%`
                        )}
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t">
                  <th scope="row" className="py-1.5 text-left font-medium">Total</th>
                  <td className={cn("px-2.5 py-1.5 text-right font-medium", SIDE.before.cell, SIDE.before.ink)}>{totalWeight(current.weights)}%</td>
                  <td className={cn("px-2.5 py-1.5 text-right font-medium", SIDE.after.cell, finalTotal !== 100 ? "text-danger-foreground" : SIDE.after.ink)}>{finalTotal}%</td>
                </tr>
                <tr className="border-t">
                  <th scope="row" className="py-1.5 text-left font-normal">Baseline</th>
                  <td className={cn("rounded-b-md px-2.5 py-1.5 text-right", SIDE.before.cell, SIDE.before.ink)}>{current.baseline}</td>
                  <td className={cn("rounded-b-md px-2.5 py-1.5 text-right", SIDE.after.cell, final.baseline !== current.baseline && cn("font-semibold", SIDE.after.ink))}>
                    {editing ? (
                      <NumberField
                        label="Proposed baseline"
                        value={final.baseline}
                        min={0}
                        max={90}
                        onChange={(v) => setEdits((e) => ({ ...e, baseline: v ?? 0 }))}
                        className="ml-auto w-20"
                      />
                    ) : (
                      final.baseline
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {p.requestedTotal !== 100 && p.rebalance && (
              <div className="space-y-2 rounded-md border bg-card px-3 py-2.5 text-xs">
                <p>
                  The weights you asked for total <span className="font-medium tabular-nums">{p.requestedTotal}%</span>. They must
                  total 100% to publish, so nothing was adjusted for you.
                </p>
                {"error" in p.rebalance ? (
                  <p className="text-muted-foreground">{p.rebalance.error} Edit the proposal to fix it.</p>
                ) : (
                  <>
                    <p className="text-muted-foreground">Suggested rebalance (keeps the weights you named, scales the rest in proportion):</p>
                    <ul className="space-y-0.5 tabular-nums">
                      {p.rebalance.changes.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      size="xs"
                      aria-pressed={useRebalance}
                      onClick={() => {
                        setUseRebalance((u) => !u)
                        setEdits((e) => ({ ...e, weights: {} }))
                      }}
                    >
                      {useRebalance ? "Use the weights as requested" : "Use suggested rebalance"}
                    </Button>
                  </>
                )}
              </div>
            )}

            <OtherChanges current={current} next={final} changes={p.changes} />

            {finalErrors.length > 0 && (
              <div className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-xs text-danger-foreground">
                <p className="font-medium">Can't be published as is</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {finalErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
                <p className="mt-1">You can still apply it to the draft and fix it there.</p>
              </div>
            )}

            {/* Optional simulation on a saved company */}
            {companies.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Simulate on a saved company</p>
                  <Select value={record?.domain} onValueChange={onSelectCompany}>
                    <SelectTrigger size="sm" aria-label="Company to simulate" className="w-56 bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {companies.map((c) => (
                        <SelectItem key={c.domain} value={c.domain}>
                          {c.synthesized_research?.company_name || c.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!currentValid ? (
                  <p className="text-xs text-muted-foreground">Your current draft has errors, so there's nothing valid to compare against.</p>
                ) : simulation ? (
                  <ScoreComparison
                    before={simulation.published}
                    after={simulation.draft}
                    beforeLabel="Current draft"
                    afterLabel="Proposed"
                    beforeSub="your draft now"
                    beforeSubMono={false}
                    dirty
                    causesTitle="Which changes moved the score"
                    idleText=""
                    invalidText="Fix the proposal's errors to simulate it."
                    showMissing
                  />
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button size="sm" variant="outline" onClick={() => onApply(final)}>
                <Check />
                Apply proposal
              </Button>
              <Button size="sm" variant="outline" aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
                <PencilLine />
                {editing ? "Done editing" : "Edit proposal"}
              </Button>
              <Button size="sm" variant="ghost" onClick={discard}>
                <X />
                Discard proposal
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Apply updates your draft only. Review it, then publish when you're ready.
            </p>
          </section>
        )}
      </CardContent>
    </Card>
  )
}

function Notes({ title, items, tone }: { title: string; items: string[]; tone?: "warning" }) {
  if (items.length === 0) return null
  return (
    <div className={cn("rounded-md border px-3 py-2 text-xs", tone === "warning" ? "border-warning-border bg-warning-soft text-warning-foreground" : "bg-card")}>
      <p className="font-medium">{title}</p>
      <ul className={cn("mt-1 list-disc space-y-0.5 pl-4", tone !== "warning" && "text-muted-foreground")}>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

const bandText = (b: SizeBand) => `${b.min}${b.max === null ? "+" : `–${b.max}`} employees: ${Math.round(b.fraction * 100)}%`

/** Industry, employee range and requirement changes, spelled out. */
function OtherChanges({ current, next, changes }: { current: IcpConfig; next: IcpConfig; changes: { kind: string; text: string }[] }) {
  const other = changes.filter((c) => c.kind !== "weights" && c.kind !== "baseline" && c.text !== "Employee ranges changed")
  const bandsChanged = JSON.stringify(current.sizeBands) !== JSON.stringify(next.sizeBands)
  if (other.length === 0 && !bandsChanged) return null
  return (
    <div className="space-y-2 text-xs">
      {other.length > 0 && (
        <div>
          <p className="font-medium">Other changes</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
            {other.map((c) => (
              <li key={c.text}>{c.text}</li>
            ))}
          </ul>
        </div>
      )}
      {bandsChanged && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <SideLabel side="before">Employee ranges now</SideLabel>
            <ul className="mt-1 space-y-0.5 text-muted-foreground tabular-nums">
              {current.sizeBands.map((b) => (
                <li key={`${b.min}-${b.max}`}>{bandText(b)}</li>
              ))}
            </ul>
          </div>
          <div>
            <SideLabel side="after">Proposed</SideLabel>
            <ul className="mt-1 space-y-0.5 tabular-nums">
              {next.sizeBands.map((b) => (
                <li key={`${b.min}-${b.max}`}>{bandText(b)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
