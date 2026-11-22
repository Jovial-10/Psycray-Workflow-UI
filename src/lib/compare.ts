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
