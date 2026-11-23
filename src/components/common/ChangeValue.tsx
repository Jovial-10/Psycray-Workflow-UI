import type { ReactNode } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { TREND_INK, trend } from "@/lib/compare"
import { cn } from "@/lib/utils"

/**
 * A value shown against its previous value: emerald with an up arrow when it
 * is more, red with a down arrow when it is less, unchanged otherwise.
 */
export function ChangeValue({
  before,
  after,
  children,
  className,
}: {
  before: number | null | undefined
  after: number | null | undefined
  children: ReactNode
  className?: string
}) {
  const t = trend(before, after)
  return (
    <span className={cn("inline-flex items-center justify-end gap-0.5", t !== "same" && cn("font-semibold", TREND_INK[t]), className)}>
      {t === "up" && <ArrowUp aria-hidden className="size-3 shrink-0" />}
      {t === "down" && <ArrowDown aria-hidden className="size-3 shrink-0" />}
      {children}
      {t !== "same" && <span className="sr-only"> ({t === "up" ? "up" : "down"} from {before})</span>}
    </span>
  )
}

const ARROW_CHANGE = /(-?\$?[\d,]+(?:\.\d+)?)(%?)(\s*→\s*)(-?\$?[\d,]+(?:\.\d+)?)(%?)/g
const SIGNED = /(^|[\s(])([+-]\d+(?:\.\d+)?)(?=[\s:).,]|$)/g
const num = (s: string) => Number(s.replace(/[$,]/g, ""))

/**
 * Colors the numbers in a change sentence: in "Company Size 15% → 11%" the
 * new value is red (less) or emerald (more); in "Industry Fit +7: …" the
 * signed amount is colored by its sign. Everything else stays as text.
 */
export function ChangeText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  const marks: { start: number; end: number; node: ReactNode }[] = []
  for (const m of text.matchAll(ARROW_CHANGE)) {
    const t = trend(num(m[1]), num(m[4]))
    const valueStart = m.index! + m[1].length + m[2].length + m[3].length
    marks.push({
      start: valueStart,
      end: m.index! + m[0].length,
      node: (
        <span key={valueStart} className={cn(t !== "same" && cn("font-medium", TREND_INK[t]))}>
          {m[4]}
          {m[5]}
          {t !== "same" && <span className="sr-only"> ({t === "up" ? "increase" : "decrease"})</span>}
        </span>
      ),
    })
  }
  for (const m of text.matchAll(SIGNED)) {
    const start = m.index! + m[1].length
    if (marks.some((k) => start >= k.start && start < k.end)) continue
    const value = Number(m[2])
    if (value === 0) continue
    marks.push({
      start,
      end: start + m[2].length,
      node: (
        <span key={start} className={cn("font-medium", TREND_INK[value > 0 ? "up" : "down"])}>
          {m[2]}
        </span>
      ),
    })
  }
  marks.sort((a, b) => a.start - b.start)
  for (const k of marks) {
    parts.push(text.slice(last, k.start), k.node)
    last = k.end
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}
