import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/services/api"
import type { CompanyResearchRecord, ResearchJobSummary } from "@/types/research"

export interface OverviewData {
  records: CompanyResearchRecord[]
  jobs: ResearchJobSummary[]
  /** "sample" when either list came from the fictional mock set. */
  source: "live" | "sample"
}

type State =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: OverviewData }

/** Loads researched companies and the research-job log for Overview. */
export function useOverviewData() {
  const [state, setState] = useState<State>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.listCompanies(), api.listResearchJobs()])
      .then(([companies, jobs]) => {
        if (cancelled) return
        const source = companies.source === "live" && jobs.source === "live" ? "live" : "sample"
        setState({ status: "ready", data: { records: companies.records, jobs: jobs.jobs, source } })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: "error",
          error: err instanceof ApiError ? err.message : "Saved research could not be loaded.",
        })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const reload = useCallback(() => {
    setState({ status: "loading" })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, reload }
}
