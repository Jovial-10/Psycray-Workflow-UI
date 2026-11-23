import { ArrowRight, Calculator, ExternalLink, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { EvidenceRef, ScoreChange } from "@/lib/scoring/icpEngine"
import { cn } from "@/lib/utils"
import type {
  CompanyFacts,
  CompanyResearchRecord,
  IcpCriterionScore,
  IcpScoring,
  IcpTier,
} from "@/types/research"
import { BriefText } from "./BriefText"
import { SideLabel } from "@/components/common/SideLabel"
import { ChangeText, ChangeValue } from "@/components/common/ChangeValue"
import { SIDE } from "@/lib/compare"
import { FitBadge } from "./FitBadge"
import { QualificationBadge } from "./QualificationBadge"

interface ResearchResultProps {
  /** True when showing previously saved research rather than a fresh run. */
  saved: boolean
  record: CompanyResearchRecord
  onRefresh: () => void
  refreshing: boolean
  /** Re-score saved evidence (company page only). */
  onRecalculate?: () => void
  recalculating?: boolean
  recalcError?: string | null
}

export function ResearchResult({
  saved,
  record,
  onRefresh,
  refreshing,
  onRecalculate,
  recalculating,
  recalcError,
}: ResearchResultProps) {
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
        <IcpScorecard
          score={record.icp_score}
          tier={record.icp_tier}
          breakdown={record.icp_breakdown}
          scoring={record.icp_scoring}
          onRecalculate={onRecalculate}
          recalculating={recalculating}
          recalcError={recalcError}
        />
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

/** Change reasons grouped by cause: settings changes read apart from new evidence. */
const CHANGE_GROUPS: { kind: ScoreChange["details"][number]["kind"]; label: string | null }[] = [
  { kind: "algorithm", label: "Scoring update" },
  { kind: "configuration", label: "ICP configuration" },
  { kind: "evidence", label: "Research evidence" },
  { kind: "unchanged", label: null },
]

const statusLabel: Record<IcpCriterionScore["status"], string> = {
  met: "Met",
  partial: "Partly met",
  not_met: "Not met",
  unknown: "Unknown",
  conflicting: "Conflicting sources",
}

interface ScorecardProps {
  score: number | null
  tier: IcpTier | null
  breakdown: IcpCriterionScore[] | null
  scoring: IcpScoring | null
  onRecalculate?: () => void
  recalculating?: boolean
  recalcError?: string | null
}

function IcpScorecard({ score, tier, breakdown, scoring, onRecalculate, recalculating, recalcError }: ScorecardProps) {
  const change = scoring?.change
  const showChange = change && change.previous_score !== null && change.reasons.length > 0
  return (
    <Card>
      <CardHeader>
        <CardTitle>ICP Score</CardTitle>
        {onRecalculate && scoring && (
          <CardAction>
            <Button
              variant="ghost"
              size="xs"
              onClick={onRecalculate}
              disabled={recalculating}
              title="Score the saved evidence again with the current ICP settings. No new research."
            >
              <Calculator className={cn(recalculating && "animate-pulse")} />
              {recalculating ? "Recalculating…" : "Recalculate"}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums">{score ?? "—"}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            {tier && <FitBadge tier={tier} className="ml-auto self-center" />}
          </div>
          {scoring?.coverage != null && scoring.coverage < 100 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {scoring.coverage}% of the score had evidence. Up to {scoring.max_possible} if the unknowns are met.
            </p>
          )}
          {scoring && scoring.baseline > 0 && (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              Includes a baseline of {scoring.baseline}; criteria fill the other {100 - scoring.baseline} points.
            </p>
          )}
        </div>

        {scoring && scoring.requirements.length > 0 && (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Hard requirements</p>
              <QualificationBadge qualification={scoring.qualification} />
            </div>
            <ul className="space-y-1">
              {scoring.requirements.map((r) => (
                <li key={r.key}>
                  <span className="flex justify-between gap-3">
                    <span>{r.requirement}</span>
                    <span className={cn("shrink-0", r.status === "fail" ? "text-danger-foreground" : "text-muted-foreground", r.status === "unknown" && "italic")}>
                      {r.status === "pass" ? "Pass" : r.status === "fail" ? "Fail" : "Unknown"}
                    </span>
                  </span>
                  <span className="text-muted-foreground">{r.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recalcError && (
          <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-xs text-danger-foreground">
            {recalcError}
          </p>
        )}

        {showChange && (
          <div className="space-y-3 rounded-md border bg-muted/40 px-3 py-2.5 text-xs">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 tabular-nums">
              <div className={cn("rounded-md border px-2.5 py-1.5", SIDE.before.tile)}>
                <SideLabel side="before">Previous</SideLabel>
                <p className={cn("text-lg font-semibold", SIDE.before.ink)}>{change.previous_score}</p>
              </div>
              <ArrowRight aria-hidden className="size-3.5 self-center text-muted-foreground" />
              <div className={cn("rounded-md border px-2.5 py-1.5", SIDE.after.tile)}>
                <SideLabel side="after">Updated</SideLabel>
                <p className={cn("text-lg font-semibold", SIDE.after.ink)}>{change.updated_score}</p>
                {change.delta !== null && change.delta !== 0 && (
                  <ChangeValue before={0} after={change.delta} className="text-xs">
                    {change.delta > 0 ? "+" : ""}
                    {change.delta} points
                  </ChangeValue>
                )}
              </div>
            </div>
            {CHANGE_GROUPS.map(({ kind, label }) => {
              const items = change.details.filter((d) => d.kind === kind)
              if (items.length === 0) return null
              return (
                <div key={kind}>
                  {label && <p className="font-medium text-foreground">{label}</p>}
                  <ul className="space-y-1 text-muted-foreground">
                    {items.map((d) => (
                      <li key={d.text}>
                        <ChangeText text={d.text} />
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}

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
                    className={cn(
                      "h-full rounded-full",
                      c.status === "unknown" ? "bg-transparent" : c.status === "conflicting" ? "bg-warning" : "bg-foreground/80",
                    )}
                    style={{ width: `${c.max ? (c.score / c.max) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className={cn(c.status === "unknown" && "italic", c.status === "conflicting" && "text-warning-foreground")}>
                    {statusLabel[c.status]}
                  </span>
                  {c.reason && ` · ${c.reason}`}
                </p>
                {c.evidence.length > 0 && <EvidenceList items={c.evidence} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            No score breakdown is stored for this research. Refresh it to generate an explainable scorecard.
          </p>
        )}

        {scoring && scoring.missing.length > 0 && (
          <div className="text-xs">
            <p className="font-medium">Missing information</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {scoring.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="border-t pt-3 text-xs text-muted-foreground">
          {scoring ? (
            <>
              Scoring v{scoring.algorithm_version} · ICP {scoring.config_version ?? "unknown"}
              {scoring.snapshot_id && <> · research {scoring.snapshot_id}</>}
              {scoring.calculated_at && <> · calculated {formatDate(scoring.calculated_at)}</>}
            </>
          ) : (
            "Scored with the earlier keyword rules. Refresh the research to rescore it from evidence."
          )}
        </p>
      </CardContent>
    </Card>
  )
}

function EvidenceList({ items }: { items: EvidenceRef[] }) {
  return (
    <ul className="mt-1.5 space-y-1 border-l pl-2.5 text-xs text-muted-foreground">
      {items.slice(0, 3).map((e) => (
        <li key={`${e.text}|${e.source}`}>
          <span className="text-foreground/80">“{e.text}”</span>{" "}
          {e.source && (
            <SourceLink source={e.source} />
          )}
          {!e.verified && <span className="italic"> (unverified source)</span>}
        </li>
      ))}
    </ul>
  )
}

function SourceLink({ source }: { source: string }) {
  const host = source.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
  return /^https?:\/\//.test(source) ? (
    <a href={source} target="_blank" rel="noreferrer" className="font-mono underline decoration-border underline-offset-2 hover:text-foreground">
      {host}
    </a>
  ) : (
    <span className="font-mono">{host}</span>
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
