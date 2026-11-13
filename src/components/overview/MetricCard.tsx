import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface MetricCardProps {
  label: string
  value: ReactNode
  /** One short line of context: the denominator, window or definition. */
  detail: ReactNode
}

/** Compact metric: label, tabular value, one line of context. No charts or icons. */
export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
      <dd className="mt-0.5 text-xs text-muted-foreground tabular-nums">{detail}</dd>
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div aria-hidden className="rounded-xl border bg-card px-4 py-3.5">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="mt-3 h-7 w-14" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  )
}
