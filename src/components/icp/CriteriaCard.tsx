import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  DIGITAL_NEEDS,
  GROWTH_SIGNALS,
  INDUSTRY_CATEGORIES,
  OWNER_TYPES,
  normalizeCountry,
  type IcpConfig,
  type IndustryCategory,
} from "@/lib/scoring/icpEngine"
import { NumberField, PercentField, Section } from "./fields"

const INDUSTRY_LEVELS = [
  { value: "1", label: "Core · 100%" },
  { value: "0.5", label: "Partial · 50%" },
  { value: "0.25", label: "Low · 25%" },
  { value: "0", label: "Not targeted" },
]

interface Props {
  draft: IcpConfig
  onChange: (next: IcpConfig) => void
}

/** What counts as a fit for each criterion. */
export function CriteriaCard({ draft, onChange }: Props) {
  const set = <K extends keyof IcpConfig>(key: K, value: IcpConfig[K]) => onChange({ ...draft, [key]: value })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criteria</CardTitle>
        <CardDescription>What earns each criterion its weight. Missing evidence is always “unknown”, never a fail.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Target industries" description="Judged on the company's own industry, never the industries it sells to.">
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {INDUSTRY_CATEGORIES.map(({ key, label }) => {
              const v = draft.industryFit[key] ?? 0
              const known = INDUSTRY_LEVELS.some((l) => Number(l.value) === v)
              return (
                <li key={key} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{label}</span>
                  <Select
                    value={String(v)}
                    onValueChange={(next) => set("industryFit", { ...draft.industryFit, [key as IndustryCategory]: Number(next) })}
                  >
                    <SelectTrigger size="sm" aria-label={`${label} fit`} className="w-36 bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {!known && <SelectItem value={String(v)}>Custom · {Math.round(v * 100)}%</SelectItem>}
                      {INDUSTRY_LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              )
            })}
          </ul>
        </Section>

        <Separator />

        <Section
          title="Preferred employee ranges"
          description="A headcount outside every range earns nothing. Ranges can't overlap."
          action={
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                const last = Math.max(0, ...draft.sizeBands.map((b) => b.max ?? b.min))
                set("sizeBands", [...draft.sizeBands, { min: last + 1, max: last + 500, fraction: 0.25 }])
              }}
            >
              <Plus />
              Add range
            </Button>
          }
        >
          <div className="grid grid-cols-[minmax(0,6rem)_minmax(0,6rem)_5rem_2rem] items-center gap-x-2 gap-y-2 text-sm">
            <span className="text-xs text-muted-foreground">From</span>
            <span className="text-xs text-muted-foreground">To</span>
            <span className="text-xs text-muted-foreground">Earns</span>
            <span />
            {draft.sizeBands.map((b, i) => {
              const update = (patch: Partial<typeof b>) =>
                set(
                  "sizeBands",
                  draft.sizeBands.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                )
              return (
                <div key={i} className="contents">
                  <NumberField label={`Range ${i + 1}: from employees`} value={b.min} min={1} onChange={(v) => update({ min: v ?? 0 })} />
                  <NumberField
                    label={`Range ${i + 1}: to employees (blank for no limit)`}
                    value={b.max}
                    min={1}
                    onChange={(v) => update({ max: v })}
                  />
                  <PercentField label={`Range ${i + 1}: share of the weight earned`} value={b.fraction} onChange={(f) => update({ fraction: f })} className="w-full" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove range ${i + 1}`}
                    onClick={() => set("sizeBands", draft.sizeBands.filter((_, j) => j !== i))}
                    className="text-muted-foreground"
                  >
                    <X />
                  </Button>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">Employees, inclusive. Leave “To” blank for no upper limit.</p>
        </Section>

        <Separator />

        <Section title="Digital service opportunities" description="Needs that count towards Digital Opportunity.">
          <CheckList
            items={DIGITAL_NEEDS}
            selected={draft.digitalOpportunity.types}
            onChange={(types) => set("digitalOpportunity", { ...draft.digitalOpportunity, types })}
          />
          <CreditRow
            label="A need a source states earns"
            value={draft.digitalOpportunity.stated}
            onChange={(stated) => set("digitalOpportunity", { ...draft.digitalOpportunity, stated })}
          />
          <CreditRow
            label="A need that is only inferred earns"
            value={draft.digitalOpportunity.inferred}
            onChange={(inferred) => set("digitalOpportunity", { ...draft.digitalOpportunity, inferred })}
          />
        </Section>

        <Separator />

        <Section
          title="Growth signals"
          description="Strength of one verified signal about this company. Strengths add up, capped at the full weight; 0% ignores a type."
        >
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {GROWTH_SIGNALS.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between gap-3 text-sm">
                <span>{label}</span>
                <PercentField
                  label={`${label} strength`}
                  value={draft.growthSignalStrength[key]}
                  onChange={(v) => set("growthSignalStrength", { ...draft.growthSignalStrength, [key]: v })}
                />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Count signals from the last</span>
            <NumberField
              label="Growth signal window in months"
              value={draft.growthWindowMonths}
              min={1}
              max={60}
              onChange={(v) => set("growthWindowMonths", v ?? 0)}
              className="w-16"
            />
            <span className="text-muted-foreground">months, measured from the research date.</span>
          </div>
          <CreditRow
            label="An undated signal counts at"
            value={draft.undatedSignalFactor}
            onChange={(v) => set("undatedSignalFactor", v)}
          />
        </Section>

        <Separator />

        <Section title="Evidence of project ownership" description="Who could own a software or integration project.">
          <CheckList
            items={OWNER_TYPES}
            selected={draft.projectOwnership.types}
            onChange={(types) => set("projectOwnership", { ...draft.projectOwnership, types })}
          />
          <CreditRow
            label="A named or described owner earns"
            value={draft.projectOwnership.stated}
            onChange={(stated) => set("projectOwnership", { ...draft.projectOwnership, stated })}
          />
          <CreditRow
            label="An owner that is only implied earns"
            value={draft.projectOwnership.inferred}
            onChange={(inferred) => set("projectOwnership", { ...draft.projectOwnership, inferred })}
          />
        </Section>

        <Separator />

        <Section
          title="Preferred locations"
          description="Shown on each scorecard. Not scored: turn on the location requirement to make it mandatory."
        >
          <Countries countries={draft.geography.countries} onChange={(countries) => set("geography", { countries })} />
        </Section>

        <Separator />

        <Section title="Fit tiers" description="Score thresholds, and how much of the weight needs evidence before a tier is given.">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">High Fit from</span>
              <NumberField label="High Fit threshold" value={draft.tiers.high} min={1} max={100} onChange={(v) => set("tiers", { ...draft.tiers, high: v ?? 0 })} className="w-16" />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">Moderate Fit from</span>
              <NumberField label="Moderate Fit threshold" value={draft.tiers.moderate} min={1} max={100} onChange={(v) => set("tiers", { ...draft.tiers, moderate: v ?? 0 })} className="w-16" />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">Needs Review below</span>
              <NumberField label="Minimum evidence coverage" value={draft.minCoverageForTier} min={0} max={100} suffix="%" onChange={(v) => set("minCoverageForTier", v ?? 0)} className="w-20" />
              <span className="text-muted-foreground">coverage</span>
            </label>
          </div>
        </Section>
      </CardContent>
    </Card>
  )
}

function CheckList<K extends string>({
  items,
  selected,
  onChange,
}: {
  items: { key: K; label: string }[]
  selected: K[]
  onChange: (next: K[]) => void
}) {
  return (
    <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {items.map(({ key, label }) => {
        const id = `check-${key}`
        const on = selected.includes(key)
        return (
          <li key={key} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={on}
              onCheckedChange={(v) => onChange(v ? items.map((i) => i.key).filter((k) => k === key || selected.includes(k)) : selected.filter((k) => k !== key))}
            />
            <label htmlFor={id} className="text-sm">
              {label}
            </label>
          </li>
        )
      })}
    </ul>
  )
}

function CreditRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm sm:justify-start">
      <span className="text-muted-foreground">{label}</span>
      <PercentField label={label} value={value} onChange={onChange} />
    </div>
  )
}

function Countries({ countries, onChange }: { countries: string[]; onChange: (next: string[]) => void }) {
  const [text, setText] = useState("")
  const add = () => {
    const c = normalizeCountry(text)
    if (c && !countries.includes(c)) onChange([...countries, c])
    setText("")
  }
  return (
    <div className="space-y-2">
      {countries.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {countries.map((c) => (
            <li key={c} className="inline-flex h-7 items-center gap-1 rounded-full border bg-card pr-1 pl-2.5 text-[13px]">
              {c}
              <Button variant="ghost" size="icon-xs" aria-label={`Remove ${c}`} onClick={() => onChange(countries.filter((x) => x !== c))} className="size-5 text-muted-foreground">
                <X />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No preferred locations.</p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a country, e.g. Canada" aria-label="Add a preferred country" className="h-8 max-w-60 md:text-sm" />
        <Button type="submit" variant="outline" size="sm" disabled={!text.trim()}>
          Add
        </Button>
      </form>
    </div>
  )
}
