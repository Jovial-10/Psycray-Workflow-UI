import { ExternalLink, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type {
  CompanyFacts,
  CompanyResearchRecord,
  IcpCriterionScore,
  IcpTier,
} from "@/types/research"
import { BriefText } from "./BriefText"
import { FitBadge } from "./FitBadge"

interface ResearchResultProps {
  /** True when showing previously saved research rather than a fresh run. */
  saved: boolean
  record: CompanyResearchRecord
  onRefresh: () => void
  refreshing: boolean
}

export function ResearchResult({ saved, record, onRefresh, refreshing }: ResearchResultProps) {
  const facts = isParsedFacts(record.company_facts) ? record.company_facts : null
  const synthesis = record.synthesized_research
  const name = synthesis?.company_name || facts?.company_name || record.domain

  return (
    <div className="space-y-6">
      {/* Header: name, domain, freshness, refresh */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
          <a
            href={`https://${record.domain}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[13px] text-muted-foreground hover:text-foreground hover:underline"
          >
            {record.domain} <ExternalLink className="size-3" />
          </a>
          <p className="mt-1 text-xs text-muted-foreground">
            {saved ? "Saved research from " : "Researched "}
            {formatDate(record.updated_at)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={cn(refreshing && "animate-spin")} />
          Refresh research
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <CompanyProfile facts={facts} summary={synthesis?.summary} unknowns={synthesis?.unknowns ?? []} />
        <IcpScorecard score={record.icp_score} tier={record.icp_tier} breakdown={record.icp_breakdown} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Brief</CardTitle>
          <CardDescription>AI-generated from the research findings. Verify key claims against the sources.</CardDescription>
        </CardHeader>
        <CardContent>
          {record.account_brief ? (
            <BriefText text={record.account_brief} />
          ) : (
            <p className="text-sm text-muted-foreground">No account brief was generated for this company.</p>
          )}
        </CardContent>
      </Card>

      <Sources urls={record.sources?.urls ?? []} />
    </div>
  )
}

/* ------------------------------------------------------------------ */

function CompanyProfile({
  facts,
  summary,
  unknowns,
}: {
  facts: CompanyFacts | null
  summary?: string
  unknowns: string[]
}) {
  const description = summary || facts?.value_proposition
  const rows: [string, string[]][] = [
    ["Industry", facts?.industry ? [facts.industry] : []],
    ["Serves", facts?.target_industries ?? []],
    ["Products & services", facts?.products_and_services ?? []],
    ["Customers", facts?.customer_types ?? []],
    ["Headquarters", facts?.headquarters_locations ?? []],
    ["Technologies", facts?.detected_technologies ?? []],
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{description || "No description was found on the company website."}</p>
        <dl className="grid gap-3 sm:grid-cols-[9rem_1fr]">
          {rows.map(([label, values]) => (
            <div key={label} className="contents">
              <dt className="font-medium">{label}</dt>
              <dd className="text-muted-foreground">
                {values.length ? values.join(", ") : <span className="italic">Not found</span>}
              </dd>
            </div>
          ))}
        </dl>
        {unknowns.length > 0 && (
          <div>
            <p className="mb-2 font-medium">Unknown / unavailable</p>
            <div className="flex flex-wrap gap-1.5">
              {unknowns.map((u) => (
                <Badge key={u} variant="outline" className="font-normal text-muted-foreground">
                  {u}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const statusLabel: Record<IcpCriterionScore["status"], string> = {
  met: "Met",
  not_met: "Not met",
  unknown: "Unknown",
}

function IcpScorecard({
  score,
  tier,
  breakdown,
}: {
  score: number | null
  tier: IcpTier | null
  breakdown: IcpCriterionScore[] | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ICP Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums">{score ?? "—"}</span>
          <span className="text-sm text-muted-foreground">/ 100</span>
          {tier && <FitBadge tier={tier} className="ml-auto self-center" />}
        </div>

        {breakdown && breakdown.length > 0 ? (
          <ul className="space-y-3 text-sm">
            {breakdown.map((c) => (
              <li key={c.criterion}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{c.criterion}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {c.status === "unknown" ? "—" : c.score} / {c.max}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", c.status === "unknown" ? "bg-transparent" : "bg-foreground/80")}
                    style={{ width: `${c.max ? (c.score / c.max) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className={cn(c.status === "unknown" && "italic")}>{statusLabel[c.status]}</span>
                  {c.reason && ` · ${c.reason}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            No score breakdown is stored for this research. Refresh it to generate an explainable scorecard.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Sources({ urls }: { urls: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sources</CardTitle>
        <CardDescription>Pages used as evidence for this research.</CardDescription>
      </CardHeader>
      <CardContent>
        {urls.length ? (
          <ul className="space-y-1.5 text-sm">
            {urls.map((url) => (
              <li key={url} className="truncate">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[13px] text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  {url.replace(/^https?:\/\//, "")}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No sources were recorded.</p>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function isParsedFacts(facts: CompanyResearchRecord["company_facts"]): facts is CompanyFacts {
  return !!facts && !("raw" in facts)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}
