import { useState, type ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * A whole-number input that keeps whatever the user is typing (empty, "1")
 * and only reports a value once it parses. Out-of-range values are reported
 * too, so validation can explain them instead of silently clamping.
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  prefix,
  label,
  className,
  invalid,
}: {
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  suffix?: ReactNode
  prefix?: ReactNode
  label: string
  className?: string
  invalid?: boolean
}) {
  // While typing, show exactly what was typed; once the value changes from
  // elsewhere (slider, rebalance, reset), show the new value instead.
  const [edit, setEdit] = useState<{ text: string; value: number | null } | null>(null)
  const text = edit && edit.value === value ? edit.text : value === null ? "" : String(value)

  return (
    <div className={cn("relative flex items-center", className)}>
      {prefix && <span className="pointer-events-none absolute left-2.5 text-sm text-muted-foreground">{prefix}</span>}
      <Input
        inputMode="numeric"
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={text}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,-]/g, "")
          const n = Number(t.replace(/,/g, ""))
          const parsed = t.trim() === "" || !Number.isFinite(n) ? null : n
          setEdit({ text: t, value: parsed })
          onChange(parsed)
        }}
        onBlur={() => setEdit(null)}
        className={cn("h-8 text-right tabular-nums md:text-sm", prefix ? "pl-6" : "", suffix ? "pr-7" : "")}
      />
      {suffix && <span className="pointer-events-none absolute right-2.5 text-sm text-muted-foreground">{suffix}</span>}
    </div>
  )
}

/** A 0–100% input for a 0–1 fraction. */
export function PercentField({
  value,
  onChange,
  label,
  className,
}: {
  value: number
  onChange: (fraction: number) => void
  label: string
  className?: string
}) {
  const shown = Math.round(value * 100)
  return (
    <NumberField
      label={label}
      value={shown}
      min={0}
      max={100}
      suffix="%"
      invalid={shown < 0 || shown > 100}
      onChange={(n) => onChange(n === null ? 0 : n / 100)}
      className={cn("w-20", className)}
    />
  )
}

/** A labelled group inside a card: title, one-line explanation, content. */
export function Section({ title, description, children, action }: { title: string; description?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
