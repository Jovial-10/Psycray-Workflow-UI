import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/services/api"
import type { CompanyList } from "@/types/research"

type State =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; list: CompanyList }

/** Loads saved research (the full company list) from the API layer. */
export function useCompanies() {
  const [state, setState] = useState<State>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .listCompanies()
      .then((list) => !cancelled && setState({ status: "ready", list }))
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
