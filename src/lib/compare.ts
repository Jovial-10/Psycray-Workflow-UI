/**
 * The comparison pair (see DESIGN.md): sky = "before" (current, published,
 * previous), indigo = "after" (proposed, draft, updated). Used wherever two
 * versions of a score or configuration sit side by side. Never a fit verdict.
 */
export const SIDE = {
  before: { tile: "border-before-border bg-before-soft", ink: "text-before-foreground", dot: "bg-before", cell: "bg-before-soft" },
  after: { tile: "border-after-border bg-after-soft", ink: "text-after-foreground", dot: "bg-after", cell: "bg-after-soft" },
} as const

export type Side = keyof typeof SIDE

/**
 * Direction of a change (see DESIGN.md, "Change direction"): more = emerald,
 * less = red, always with an arrow. It describes direction, not good or bad.
 */
export type Trend = "up" | "down" | "same"

export function trend(before: number | null | undefined, after: number | null | undefined): Trend {
  if (before == null || after == null || Number.isNaN(before) || Number.isNaN(after)) return "same"
  return after > before ? "up" : after < before ? "down" : "same"
}

export const TREND_INK: Record<Trend, string> = {
  up: "text-success-foreground",
  down: "text-danger-foreground",
  same: "",
}
