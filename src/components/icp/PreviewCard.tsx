import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FitBadge } from "@/components/research/FitBadge"
import { QualificationBadge } from "@/components/research/QualificationBadge"
import type { Preview } from "@/lib/icpStudio"
import { cn } from "@/lib/utils"
import type { CompanyResearchRecord } from "@/types/research"

interface Props {
  companies: CompanyResearchRecord[]
  /** Saved companies without scoring evidence (research from before engine v2). */
  legacyCount: number
  record: CompanyResearchRecord | null
  onSelect: (domain: string) => void
  preview: Preview | null
  dirty: boolean
  publishedLabel: string
}

const name = (r: CompanyResearchRecord) => r.synthesized_research?.company_name || r.domain

/** Scores a saved company with the published version and with the draft, side by side. */
export function PreviewCard({ companies, legacyCount, record, onSelect, preview, dirty, publishedLabel }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview on a saved company</CardTitle>
        <CardDescription>Same saved evidence, scored both ways in your browser. Nothing is saved or re-researched.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {companies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved company has scoring evidence yet. Refresh a company's research once, then preview it here.
          </p>
        ) : (
          <Select value={record?.domain} onValueChange={onSelect}>
            <SelectTrigger aria-label="Company to preview" className="w-full bg-card">
              <SelectValue placeholder="Choose a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.domain} value={c.domain}>
                  {name(c)} <span className="font-mono text-xs text-muted-foreground">{c.domain}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {legacyCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {legacyCount} more {legacyCount === 1 ? "company needs" : "companies need"} one research refresh before
            {legacyCount === 1 ? " it" : " they"} can be previewed or rescored.
          </p>
        )}

        {preview && record && (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3" aria-live="polite">
              <Score label="Published" sub={publishedLabel} mono score={preview.published.score} tier={preview.published.tier} />
              <ArrowRight aria-hidden className="mb-3 size-4 text-muted-foreground" />
              {preview.draft ? (
                <Score
                  label="Draft"
                  sub={delta(preview.draft.score - preview.published.score)}
                  score={preview.draft.score}
                  tier={preview.draft.tier}
                  emphasis
                />
              ) : (
                <p className="pb-2 text-xs text-muted-foreground">Fix the highlighted settings to preview the draft.</p>
              )}
            </div>

            {preview.draft && (
              <>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Supported by evidence: {preview.draft.score}. Up to {preview.draft.max_possible} if the{" "}
                  {preview.draft.coverage < 100 ? `${100 - preview.draft.coverage}% of weight that's unknown` : "unknowns"} turned out
                  fully met. Evidence covers {preview.draft.coverage}% of the weight.
                </p>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Why the draft differs</p>
                  {!dirty ? (
                    <p className="text-xs text-muted-foreground">Change a weight, the baseline or a criterion to see its effect here.</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {(preview.draft.change?.details ?? [])
                        .filter((d) => d.kind !== "unchanged" && !d.text.startsWith("ICP configuration changed"))
                        .map((d) => (
                          <li key={d.text}>{d.text}</li>
                        ))}
                      {(preview.draft.change?.details ?? []).every((d) => d.kind === "unchanged" || d.text.startsWith("ICP configuration changed")) && (
                        <li>These changes don't affect this company.</li>
                      )}
                    </ul>
                  )}
                </div>

                <table className="w-full text-xs tabular-nums">
                  <caption className="sr-only">Criterion points, published and draft</caption>
                  <thead className="text-muted-foreground">
                    <tr>
                      <th scope="col" className="pb-1 text-left font-normal">Criterion</th>
                      <th scope="col" className="pb-1 text-right font-normal">Published</th>
                      <th scope="col" className="pb-1 text-right font-normal">Draft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.draft.criteria.map((c) => {
                      const before = preview.published.criteria.find((p) => p.key === c.key)!
                      const changed = before.score !== c.score
                      return (
                        <tr key={c.key} className="border-t">
                          <th scope="row" className="py-1.5 text-left font-normal">
                            {c.criterion}
                            {c.status === "unknown" && <span className="text-muted-foreground italic"> · unknown</span>}
                          </th>
                          <td className="py-1.5 text-right text-muted-foreground">
                            {before.score} / {before.max}
                          </td>
                          <td className={cn("py-1.5 text-right", changed && "font-medium")}>
                            {c.score} / {c.max}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t">
                      <th scope="row" className="py-1.5 text-left font-normal">Baseline</th>
                      <td className="py-1.5 text-right text-muted-foreground">{preview.published.baseline}</td>
                      <td className={cn("py-1.5 text-right", preview.draft.baseline !== preview.published.baseline && "font-medium")}>
                        {preview.draft.baseline}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {preview.draft.requirements.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">Hard requirements</p>
                      <QualificationBadge qualification={preview.draft.qualification} />
                    </div>
                    <ul className="space-y-1 text-xs">
                      {preview.draft.requirements.map((r) => (
                        <li key={r.key} className="flex justify-between gap-3">
                          <span>{r.requirement}</span>
                          <span className={cn("shrink-0", r.status === "fail" ? "text-danger-foreground" : "text-muted-foreground", r.status === "unknown" && "italic")}>
                            {r.status === "pass" ? "Pass" : r.status === "fail" ? "Fail" : "Unknown"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {record.icp_score !== preview.published.score && (
                  <p className="text-xs text-muted-foreground">
                    Its saved score is {record.icp_score ?? "—"}
                    {record.icp_scoring?.config_version ? ` (scored with ${record.icp_scoring.config_version})` : ""}. Recalculate
                    saved companies to update it.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
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
