import { useCallback, useState } from "react"
import { api } from "@/services/api"

const STORAGE_KEY = "psycray-icp-admin"

interface Admin {
  key: string
  name: string
}

function read(): Admin | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const v: unknown = raw ? JSON.parse(raw) : null
    return v && typeof v === "object" && "key" in v && "name" in v ? (v as Admin) : null
  } catch {
    return null
  }
}

/**
 * The named admin key for this browser tab. The key is checked by the
 * server on every protected call; this only remembers it for the tab
 * (sessionStorage), so closing the tab signs out.
 */
export function useIcpAdmin() {
  const [admin, setAdmin] = useState<Admin | null>(read)

  const signIn = useCallback(async (key: string) => {
    const { name } = await api.checkAdmin(key.trim())
    const next = { key: key.trim(), name }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Private mode: stay signed in for this page view only
    }
    setAdmin(next)
    return name
  }, [])

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setAdmin(null)
  }, [])

  return { admin, signIn, signOut }
}
