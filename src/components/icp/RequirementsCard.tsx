import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { REQUIREMENT_LABELS, type IcpConfig, type RequirementKey } from "@/lib/scoring/icpEngine"
import { NumberField } from "./fields"

interface Props {
  draft: IcpConfig
  onChange: (next: IcpConfig) => void
}

/** Mandatory requirements, kept separate from the weighted score. */
export function RequirementsCard({ draft, onChange }: Props) {
  const req = draft.requirements
  const setReq = <K extends RequirementKey>(key: K, patch: Partial<IcpConfig["requirements"][K]>) =>
    onChange({ ...draft, requirements: { ...req, [key]: { ...req[key], ...patch } } })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hard requirements</CardTitle>
        <CardDescription>
          Pass or fail, separate from the score: a company can score high and still be disqualified. If the research
          couldn't find the information, the requirement shows as unverified, never as failed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {REQUIREMENT_LABELS.map(({ key, label, description }) => {
            const id = `req-${key}`
            return (
              <li key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <Switch id={id} checked={req[key].enabled} onCheckedChange={(enabled) => setReq(key, { enabled })} />
                <label htmlFor={id} className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {key === "location"
                      ? `Headquarters in ${draft.geography.countries.join(" or ") || "a preferred location (add one under Criteria)"}.`
                      : description}
                  </span>
                </label>
                {key === "min_employees" && (
                  <NumberField
                    label="Minimum employee count"
                    value={req.min_employees.value}
                    min={1}
                    onChange={(v) => setReq("min_employees", { value: v ?? 0 })}
                    className="w-28"
                  />
                )}
                {key === "min_revenue" && (
                  <NumberField
                    label="Minimum annual revenue in US dollars"
                    value={req.min_revenue.usd}
                    min={0}
                    prefix="$"
                    onChange={(v) => setReq("min_revenue", { usd: v ?? 0 })}
                    className="w-36"
                  />
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
