import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/services/api"
import type { IcpConfigState } from "@/types/research"

type State =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; config: IcpConfigState }

/** Published ICP versions, with a reload for after a publish. */
export function useIcpConfig() {
  const [state, setState] = useState<State>({ status: "loading" })
  const latest = useRef(0)

  const load = useCallback(() => {
    const id = ++latest.current
    api.getIcpConfig().then(
      (config) => id === latest.current && setState({ status: "ready", config }),
      (err: unknown) =>
        id === latest.current &&
        setState({ status: "error", error: err instanceof Error ? err.message : "The ICP configuration couldn't load." }),
    )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}
