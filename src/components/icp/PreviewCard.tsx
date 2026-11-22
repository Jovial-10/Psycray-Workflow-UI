import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Preview } from "@/lib/icpStudio"
import type { CompanyResearchRecord } from "@/types/research"
import { ScoreComparison } from "./ScoreComparison"

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
            <ScoreComparison
              before={preview.published}
              after={preview.draft}
              beforeLabel="Published"
              afterLabel="Draft"
              beforeSub={publishedLabel}
              dirty={dirty}
              causesTitle="Why the draft differs"
              idleText="Change a weight, the baseline or a criterion to see its effect here."
              invalidText="Fix the highlighted settings to preview the draft."
            />
            {record.icp_score !== preview.published.score && (
              <p className="text-xs text-muted-foreground">
                Its saved score is {record.icp_score ?? "—"}
                {record.icp_scoring?.config_version ? ` (scored with ${record.icp_scoring.config_version})` : ""}. Recalculate
                saved companies to update it.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
