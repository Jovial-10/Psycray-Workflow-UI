import { useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "react-router"
import { ResearchForm } from "@/components/research/ResearchForm"
import { ResearchResult } from "@/components/research/ResearchResult"
import { ResearchStatus } from "@/components/research/ResearchStatus"
import { ResultSkeleton } from "@/components/research/ResultSkeleton"
import { useResearchJob } from "@/hooks/useResearchJob"
import type { ResearchRequest } from "@/types/research"

export function CompanyResearchPage() {
  const research = useResearchJob()
  const lastRequest = useRef<ResearchRequest | null>(null)
  const [params] = useSearchParams()
  const handoff = params.get("q")?.trim() ?? ""
  const startedHandoff = useRef<string | null>(null)

  const { start } = research
  const run = useCallback(
    (request: ResearchRequest) => {
      lastRequest.current = request
      void start(request)
    },
    [start],
  )

  // `/research?q=acme.com` (from Overview) starts research right away, once per query.
  useEffect(() => {
    if (handoff.length >= 2 && startedHandoff.current !== handoff) {
      startedHandoff.current = handoff
      run({ input: handoff })
    }
  }, [handoff, run])

  const { job } = research
  const record = research.phase === "done" ? job?.record : null

  return (
    <div className="space-y-6">
      <ResearchForm key={handoff} initialValue={handoff} busy={research.isBusy} onSubmit={(input) => run({ input })} />

      <ResearchStatus
        state={research}
        onRetry={() => lastRequest.current && run(lastRequest.current)}
      />

      {research.isBusy && <ResultSkeleton />}

      {job && record && (
        <ResearchResult
          job={job}
          record={record}
          refreshing={research.isBusy}
          onRefresh={() => run({ input: record.domain, refresh: true })}
        />
      )}
    </div>
  )
}
