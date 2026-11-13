import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { COMPANY_SORTS, TIER_FILTERS, type CompanySort, type TierFilter } from "@/lib/companies"
import { cn } from "@/lib/utils"

interface CompaniesToolbarProps {
  query: string
  tier: TierFilter
  sort: CompanySort
  /** Rows per tier, shown on each chip. Omitted while loading (no false zeros). */
  counts?: Record<TierFilter, number>
  onQueryChange: (query: string) => void
  onTierChange: (tier: TierFilter) => void
  onSortChange: (sort: CompanySort) => void
}

/** Search, fit-tier chips and sort for the saved-companies list. */
export function CompaniesToolbar({
  query,
  tier,
  sort,
  counts,
  onQueryChange,
  onTierChange,
  onSortChange,
}: CompaniesToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by company or domain"
            aria-label="Search saved companies"
            className="h-9 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => onQueryChange("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
            >
              <X />
            </Button>
          )}
        </div>
        <Select value={sort} onValueChange={(v) => onSortChange(v as CompanySort)}>
          <SelectTrigger aria-label="Sort companies" className="h-9 w-full bg-card sm:w-48">
            <span className="text-muted-foreground">Sort:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {COMPANY_SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div role="radiogroup" aria-label="Filter by fit tier" className="flex flex-wrap gap-1.5">
        {TIER_FILTERS.map(({ value, label }) => {
          const selected = tier === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onTierChange(value)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[13px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                selected && "border-foreground/20 bg-card font-medium text-foreground shadow-xs",
              )}
            >
              {label}
              {counts && <span className="text-xs text-muted-foreground tabular-nums">{counts[value]}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
