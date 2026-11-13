import { useCallback, useEffect, useRef, useState } from "react"
import { api, ApiError } from "@/services/api"
import type { ResearchJob, ResearchRequest } from "@/types/research"

const POLL_INTERVAL_MS = 3000
/** After this long, tell the user research is taking longer than usual. */
export const SLOW_AFTER_MS = 90_000
/** Consecutive failed status checks tolerated before giving up. */
const MAX_POLL_FAILURES = 3

export type ResearchPhase =
  | "idle"
  | "submitting" // POST in flight
  | "running" // job accepted, polling for status
  | "done" // job reached a final status (any outcome)
  | "error" // request could not be made or status could not be read

export interface ResearchState {
  phase: ResearchPhase
  job: ResearchJob | null
  error: string | null
  startedAt: number | null
}

const initialState: ResearchState = { phase: "idle", job: null, error: null, startedAt: null }

function messageOf(err: unknown) {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again."
}

/** Start a research job and poll it until it reaches a final status. */
export function useResearchJob() {
  const [state, setState] = useState<ResearchState>(initialState)
  // Incremented on every new run / reset so stale polls stop themselves.
  const runId = useRef(0)
  // Tracks mounting separately: React StrictMode mounts twice in development,
  // and a run started on mount must survive that simulated remount.
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const isCurrent = (run: number) => mounted.current && runId.current === run

  const poll = useCallback(async (jobId: string, myRun: number) => {
    let failures = 0
    while (isCurrent(myRun)) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      if (!isCurrent(myRun)) return
      try {
        const job = await api.getResearchJob(jobId)
        if (!isCurrent(myRun)) return
        failures = 0
        setState((s) => ({ ...s, job, phase: job.status === "running" ? "running" : "done" }))
        if (job.status !== "running") return
      } catch (err) {
        if (++failures >= MAX_POLL_FAILURES) {
          if (isCurrent(myRun)) setState((s) => ({ ...s, phase: "error", error: messageOf(err) }))
          return
        }
      }
    }
  }, [])

  const start = useCallback(
    async (request: ResearchRequest) => {
      const myRun = ++runId.current
      setState({ phase: "submitting", job: null, error: null, startedAt: Date.now() })
      try {
        const { job_id } = await api.startResearch(request)
        if (!isCurrent(myRun)) return
        setState((s) => ({ ...s, phase: "running" }))
        await poll(job_id, myRun)
      } catch (err) {
        if (isCurrent(myRun)) setState((s) => ({ ...s, phase: "error", error: messageOf(err) }))
      }
    },
    [poll],
  )

  const reset = useCallback(() => {
    runId.current++
    setState(initialState)
  }, [])

  const isBusy = state.phase === "submitting" || state.phase === "running"

  return { ...state, isBusy, start, reset }
}
