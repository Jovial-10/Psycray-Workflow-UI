import { createContext } from "react"

/** "system" follows the OS setting; the others are explicit user choices. */
export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

/** Also read by the pre-paint script in index.html; keep the two in sync. */
export const THEME_STORAGE_KEY = "psycray-theme"

export interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function readStoredPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === "light" || value === "dark" ? value : "system"
  } catch {
    return "system"
  }
}

export function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}
