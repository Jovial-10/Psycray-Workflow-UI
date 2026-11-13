import { useRef } from "react"
import { ResearchForm } from "@/components/research/ResearchForm"
import { ResearchResult } from "@/components/research/ResearchResult"
import { ResearchStatus } from "@/components/research/ResearchStatus"
import { ResultSkeleton } from "@/components/research/ResultSkeleton"
import { useResearchJob } from "@/hooks/useResearchJob"
import type { ResearchRequest } from "@/types/research"

export function CompanyResearchPage() {
  const research = useResearchJob()
  const lastRequest = useRef<ResearchRequest | null>(null)

  function run(request: ResearchRequest) {
    lastRequest.current = request
    void research.start(request)
  }

  const { job } = research
  const record = research.phase === "done" ? job?.record : null

  return (
    <div className="space-y-6">
      <ResearchForm busy={research.isBusy} onSubmit={(input) => run({ input })} />

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
