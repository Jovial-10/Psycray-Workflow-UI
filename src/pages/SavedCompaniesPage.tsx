import { useMemo } from "react"
import { Building2, RotateCw, Search, SearchX } from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { EmptyState } from "@/components/common/EmptyState"
import { CompaniesTable, CompaniesTableSkeleton } from "@/components/companies/CompaniesTable"
import { CompaniesToolbar } from "@/components/companies/CompaniesToolbar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompanies } from "@/hooks/useCompanies"
import {
  COMPANY_SORTS,
  TIER_FILTERS,
  matchesQuery,
  matchesTier,
  sortCompanies,
  toCompanyRow,
  type CompanySort,
  type TierFilter,
} from "@/lib/companies"

const isTier = (v: string | null): v is TierFilter => TIER_FILTERS.some((t) => t.value === v)
const isSort = (v: string | null): v is CompanySort => COMPANY_SORTS.some((s) => s.value === v)

export function SavedCompaniesPage() {
  const companies = useCompanies()
  const [params, setParams] = useSearchParams()

  // Filters live in the URL: shareable, and Back returns to the same view.
  const query = params.get("q") ?? ""
  const tierParam = params.get("tier")
  const sortParam = params.get("sort")
  const tier: TierFilter = isTier(tierParam) ? tierParam : "all"
  const sort: CompanySort = isSort(sortParam) ? sortParam : "recent"

  function update(key: string, value: string, fallback: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value && value !== fallback) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const rows = useMemo(
    () => (companies.status === "ready" ? companies.list.records.map(toCompanyRow) : []),
    [companies],
  )
  const counts = useMemo(() => {
    const searched = rows.filter((r) => matchesQuery(r, query))
    return Object.fromEntries(
      TIER_FILTERS.map(({ value }) => [value, searched.filter((r) => matchesTier(r, value)).length]),
    ) as Record<TierFilter, number>
  }, [rows, query])
  const visible = useMemo(
    () => sortCompanies(rows.filter((r) => matchesQuery(r, query) && matchesTier(r, tier)), sort),
    [rows, query, tier, sort],
  )

  if (companies.status === "error") {
    return (
      <EmptyState
        icon={RotateCw}
        title="Saved research couldn't load"
        description={companies.error}
        action={
          <Button variant="outline" onClick={companies.reload}>
            <RotateCw />
            Try again
          </Button>
        }
      />
    )
  }

  if (companies.status === "ready" && rows.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No companies researched yet"
        description="Every company you research is saved here, so you can reopen it later without running research again."
        action={
          <Button asChild>
            <Link to="/research">
              <Search />
              Research a company
            </Link>
          </Button>
        }
      />
    )
  }

  const reachable = rows.filter((r) => r.reachable).length
  const filtered = query.trim() !== "" || tier !== "all"

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground tabular-nums">
        {companies.status === "loading" ? (
          <Skeleton className="h-4 w-56" />
        ) : (
          <>
            {reachable} {reachable === 1 ? "company" : "companies"} researched
            {rows.length > reachable && ` · ${rows.length - reachable} unreachable`}
            {companies.list.source === "sample" && " · sample data"}
          </>
        )}
      </div>

      <CompaniesToolbar
        query={query}
        tier={tier}
        sort={sort}
        counts={companies.status === "ready" ? counts : undefined}
        onQueryChange={(v) => update("q", v, "")}
        onTierChange={(v) => update("tier", v, "all")}
        onSortChange={(v) => update("sort", v, "recent")}
      />

      <section aria-label="Saved companies" className="overflow-hidden rounded-xl border bg-card">
        {companies.status === "loading" ? (
          <CompaniesTableSkeleton rows={8} />
        ) : visible.length ? (
          <CompaniesTable rows={visible} />
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <SearchX aria-hidden className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">No companies match</p>
            <p className="text-sm text-muted-foreground">Try a different search or fit tier.</p>
            {filtered && (
              <Button variant="outline" size="sm" onClick={() => setParams({}, { replace: true })}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
