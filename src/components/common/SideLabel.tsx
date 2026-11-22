import type { ReactNode } from "react"
import { SIDE, type Side } from "@/lib/compare"
import { cn } from "@/lib/utils"

/** A small colored label for one side of a comparison: dot + text in the side's ink. */
export function SideLabel({ side, children, className }: { side: Side; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", SIDE[side].ink, className)}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", SIDE[side].dot)} />
      {children}
    </span>
  )
}
