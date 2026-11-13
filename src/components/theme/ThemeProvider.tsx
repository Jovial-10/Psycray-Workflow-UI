import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  readStoredPreference,
  systemTheme,
  THEME_STORAGE_KEY,
  ThemeContext,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme"

/**
 * Applies the `dark` class to <html> from the user's preference.
 * Defaults to the OS setting; an explicit choice is remembered in localStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference)
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme)

  // Track OS changes so "system" stays live.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setSystem(media.matches ? "dark" : "light")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  const resolved = preference === "system" ? system : preference

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark")
  }, [resolved])

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference: (next: ThemePreference) => {
        setPreferenceState(next)
        try {
          if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY)
          else localStorage.setItem(THEME_STORAGE_KEY, next)
        } catch {
          // Storage unavailable (private mode): the choice lasts for this session only.
        }
      },
    }),
    [preference, resolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
