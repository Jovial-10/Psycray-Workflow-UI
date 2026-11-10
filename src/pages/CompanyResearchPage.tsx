import { useRef } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { ResearchForm } from "@/components/research/ResearchForm"
import { ResearchResult } from "@/components/research/ResearchResult"
import { ResearchStatus } from "@/components/research/ResearchStatus"
import { Badge } from "@/components/ui/badge"
import { useResearchJob } from "@/hooks/useResearchJob"
import { apiMode } from "@/services/api"
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
    <>
      <PageHeader
        title="Company Research"
        description="Research a company by name or domain using the n8n research agent."
        actions={apiMode === "mock" ? <Badge variant="outline">Mock data</Badge> : undefined}
      />

      <div className="space-y-6">
        <ResearchForm busy={research.isBusy} onSubmit={(input) => run({ input })} />

        <ResearchStatus
          state={research}
          onRetry={() => lastRequest.current && run(lastRequest.current)}
        />

        {job && record && (
          <ResearchResult
            job={job}
            record={record}
            refreshing={research.isBusy}
            onRefresh={() => run({ input: record.domain, refresh: true })}
          />
        )}
      </div>
    </>
  )
}
