import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Globe, RotateCw, SearchX } from "lucide-react"
import { Link, useLocation, useNavigate, useParams } from "react-router"
import { EmptyState } from "@/components/common/EmptyState"
import { ResearchResult } from "@/components/research/ResearchResult"
import { ResultSkeleton } from "@/components/research/ResultSkeleton"
import { ScoreHistory } from "@/components/research/ScoreHistory"
import { Button } from "@/components/ui/button"
import { useCompanies } from "@/hooks/useCompanies"
import { retryPath } from "@/lib/companies"
import { api } from "@/services/api"
import type { CompanyResearchRecord } from "@/types/research"

/**
 * One company's saved research, read from the database (never re-run).
 * - Recalculate: re-scores the saved evidence (no research, no LLM).
 * - Refresh: hands off to Company Research with the cache skipped.
 */
export function CompanyDetailPage() {
  const { domain = "" } = useParams()
  const navigate = useNavigate()
  const companies = useCompanies()
  const recalc = useRecalculate(domain)

  // Return to the exact list view the company was opened from (filters included)
  const state: unknown = useLocation().state
  const from =
    state && typeof state === "object" && "from" in state && typeof state.from === "string" && state.from.startsWith("/")
      ? state.from
      : "/companies"
  const back = (
    <Link
      to={from}
      className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      {from === "/" ? "Overview" : "Saved companies"}
    </Link>
  )

  if (companies.status === "loading") {
    return (
      <div className="space-y-6">
        {back}
        <ResultSkeleton />
      </div>
    )
  }

  if (companies.status === "error") {
    return (
      <div className="space-y-6">
        {back}
        <EmptyState
          icon={RotateCw}
          title="Saved research couldn't load"
          description={companies.error}
          action={
            <Button variant="outline" onClick={companies.reload}>
              <RotateCw />
              Try again
            </Button>
          }
        />
      </div>
    )
  }

  const saved = companies.list.records.find((r) => r.domain === domain)
  const record = recalc.record ?? saved

  return (
    <div className="space-y-6">
      {back}
      {!record ? (
        <EmptyState
          icon={SearchX}
          title="No saved research for this company"
          description={
            <>
              <span className="font-mono text-[13px]">{domain}</span> hasn't been researched yet, or its research
              was removed.
            </>
          }
          action={
            <Button asChild>
              <Link to={retryPath(domain)}>Research it now</Link>
            </Button>
          }
        />
      ) : record.status !== "validated" ? (
        <EmptyState
          icon={Globe}
          title="This website couldn't be reached"
          description={
            <>
              The last attempt to research <span className="font-mono text-[13px]">{domain}</span> failed because the
              site didn't load or returned an error.
            </>
          }
          action={
            <Button asChild variant="outline">
              <Link to={retryPath(domain)}>
                <RotateCw />
                Try again
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <ResearchResult
            saved
            record={record}
            refreshing={false}
            onRefresh={() => navigate(retryPath(domain))}
            onRecalculate={recalc.run}
            recalculating={recalc.pending}
            recalcError={recalc.error}
          />
          <ScoreHistory domain={domain} refreshKey={recalc.record} />
        </>
      )}
    </div>
  )
}

/**
 * Recalculates the score for one domain. Ignores repeat clicks while a
 * request is running, and drops responses that arrive after the user has
 * moved to another company (no stale updates).
 */
function useRecalculate(domain: string) {
  const [state, setState] = useState<{
    domain: string
    record: CompanyResearchRecord | null
    pending: boolean
    error: string | null
  }>({ domain, record: null, pending: false, error: null })
  const latest = useRef(0)
  const current = useRef(domain)

  useEffect(() => {
    current.current = domain
    latest.current++ // invalidate anything in flight for the previous company
  }, [domain])

  const own = state.domain === domain ? state : { domain, record: null, pending: false, error: null }

  function run() {
    if (own.pending) return
    const id = ++latest.current
    setState({ ...own, pending: true, error: null })
    api.recalculateScore(domain).then(
      ({ record }) => {
        if (id !== latest.current || current.current !== domain) return
        setState({ domain, record, pending: false, error: null })
      },
      (err: unknown) => {
        if (id !== latest.current || current.current !== domain) return
        setState({ ...own, pending: false, error: err instanceof Error ? err.message : "Recalculation failed." })
      },
    )
  }

  return { record: own.record, pending: own.pending, error: own.error, run }
}
