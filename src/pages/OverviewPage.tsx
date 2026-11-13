import type { ReactNode } from "react"
import { Building2, Info, RotateCw } from "lucide-react"
import { Link } from "react-router"
import { EmptyState } from "@/components/common/EmptyState"
import { ActivityFeed, ActivitySkeleton } from "@/components/overview/ActivityFeed"
import { MetricCard, MetricCardSkeleton } from "@/components/overview/MetricCard"
import { CompaniesTable, CompaniesTableSkeleton } from "@/components/companies/CompaniesTable"
import { ResearchBar } from "@/components/overview/ResearchBar"
import { Button } from "@/components/ui/button"
import { useOverviewData, type OverviewData } from "@/hooks/useOverviewData"
import { RECENT_DAYS, recentCompanies, researchActivity, summarize } from "@/lib/overview"

export function OverviewPage() {
  const overview = useOverviewData()

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Psycray researches prospective clients from their website and recent news, scores how well they fit
          Psycray's ideal customer profile, and writes a sales-ready brief with its sources.
        </p>
      </header>

      <ResearchBar />

      {overview.status === "loading" && <OverviewSkeleton />}

      {overview.status === "error" && (
        <EmptyState
          icon={RotateCw}
          title="Saved research couldn't load"
          description={overview.error}
          action={
            <Button variant="outline" onClick={overview.reload}>
              <RotateCw />
              Try again
            </Button>
          }
        />
      )}

      {overview.status === "ready" && (
        <>
          {/* No notice over an empty list: there are no sample companies to describe */}
          {overview.data.source === "sample" && overview.data.records.length > 0 && <SampleDataNotice />}
          <Dashboard data={overview.data} />
        </>
      )}
    </div>
  )
}

function Dashboard({ data: { records, jobs } }: { data: OverviewData }) {
  const m = summarize(records)
  const rows = recentCompanies(records)
  const activity = researchActivity(jobs, records)
  const highFitPct = Math.round(m.highFitShare * 100)

  return (
    <>
      <section aria-labelledby="metrics-title">
        <h2 id="metrics-title" className="sr-only">
          Key metrics
        </h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Companies researched"
            value={m.researched}
            detail={m.unreachable ? `+${m.unreachable} unreachable` : m.researched ? "All lookups succeeded" : "None yet"}
          />
          <MetricCard
            label="High-fit opportunities"
            value={m.highFit}
            detail={m.researched ? `${highFitPct}% of researched` : "ICP score 80+"}
          />
          <MetricCard
            label="Average ICP score"
            value={m.averageScore === null ? "—" : Math.round(m.averageScore)}
            detail={m.scored ? `Across ${m.scored} scored` : "No scores yet"}
          />
          <MetricCard label="Recently researched" value={m.recent} detail={`Last ${RECENT_DAYS} days`} />
        </dl>
      </section>

      {rows.length === 0 && activity.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies researched yet"
          description="Research your first company above. It will appear here with its ICP score, fit tier and research date."
        />
      ) : (
        <div className="space-y-6">
          <Panel
            title="Recent companies"
            action={
              <Link to="/companies" className="text-[13px] text-muted-foreground hover:text-foreground">
                View all
              </Link>
            }
          >
            {rows.length ? (
              <CompaniesTable rows={rows} />
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground">No company has finished research yet.</p>
            )}
          </Panel>
          <Panel title="Recent activity">
            <ActivityFeed events={activity} />
          </Panel>
        </div>
      )}
    </>
  )
}

/** Bordered section with a compact title row. */
function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const id = `${title.toLowerCase().replace(/\s+/g, "-")}-title`
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-xl border bg-card">
      <div className="flex h-11 items-center justify-between border-b px-4">
        <h2 id={id} className="text-sm font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function SampleDataNotice() {
  return (
    <p className="flex items-start gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-[13px] text-muted-foreground">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="font-medium text-foreground">Sample data.</span> These companies are fictional. Research
        history from n8n isn't connected yet, so new research won't appear here.
      </span>
    </p>
  )
}

function OverviewSkeleton() {
  return (
    <>
      {/* Invisible copy reserves the notice's exact height at every width, so metrics don't jump */}
      <div aria-hidden className="invisible">
        <SampleDataNotice />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-6">
        <Panel title="Recent companies">
          <CompaniesTableSkeleton />
        </Panel>
        <Panel title="Recent activity">
          <ActivitySkeleton />
        </Panel>
      </div>
    </>
  )
}
