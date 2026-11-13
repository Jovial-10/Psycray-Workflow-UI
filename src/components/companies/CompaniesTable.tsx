import { ChevronRight, RotateCw } from "lucide-react"
import { Link, useLocation } from "react-router"
import { FitBadge } from "@/components/research/FitBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { companyPath, retryPath, type CompanyRow } from "@/lib/companies"
import { timeAgo } from "@/lib/overview"

const head = "h-9 px-3 text-xs font-medium text-muted-foreground"
const cell = "px-3 py-2.5"

/**
 * Saved companies. Whole rows open the company's saved research; unreachable
 * domains offer "Try again" instead. Columns respond to the table's own width
 * (container queries): the domain moves under the name when narrow, and
 * industry and date drop out first.
 */
export function CompaniesTable({ rows }: { rows: CompanyRow[] }) {
  // The company page's back link returns here, filters and all
  const { pathname, search } = useLocation()
  const from = pathname + search

  return (
    <div className="@container">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={head}>Company</TableHead>
            <TableHead className={`${head} hidden @3xl:table-cell`}>Domain</TableHead>
            <TableHead className={`${head} hidden @4xl:table-cell`}>Industry</TableHead>
            <TableHead className={`${head} text-right`}>ICP</TableHead>
            <TableHead className={head}>Fit</TableHead>
            <TableHead className={`${head} hidden text-right @lg:table-cell`}>Researched</TableHead>
            <TableHead className={`${head} w-10`}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.domain} className="group relative hover:bg-muted/40">
              {/* Below @3xl the cell takes the spare width (w-full + max-w-0) so the stacked domain truncates to it */}
              <TableCell className={`${cell} w-full max-w-0 whitespace-normal @3xl:w-auto @3xl:max-w-56`}>
                {row.reachable ? (
                  <Link
                    to={companyPath(row.domain)}
                    state={{ from }}
                    className="font-medium outline-none after:absolute after:inset-0 after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-ring/60 focus-visible:after:ring-inset"
                  >
                    {row.name}
                  </Link>
                ) : (
                  <span title={row.domain} className="block truncate font-mono text-[13px]">
                    {row.domain}
                  </span>
                )}
                {row.reachable && (
                  <span
                    title={row.domain}
                    className="block truncate font-mono text-xs text-muted-foreground @3xl:hidden"
                  >
                    {row.domain}
                  </span>
                )}
              </TableCell>
              <TableCell className={`${cell} hidden max-w-48 truncate font-mono text-[13px] text-muted-foreground @3xl:table-cell`}>
                {row.reachable ? <span title={row.domain}>{row.domain}</span> : "—"}
              </TableCell>
              <TableCell className={`${cell} hidden max-w-44 truncate text-muted-foreground @4xl:table-cell`}>
                <span title={row.industry ?? undefined}>{row.industry ?? "—"}</span>
              </TableCell>
              <TableCell className={`${cell} text-right font-medium tabular-nums`}>
                {row.score ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className={cell}>
                {!row.reachable ? (
                  <Badge variant="danger">Unreachable</Badge>
                ) : row.tier ? (
                  <FitBadge tier={row.tier} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className={`${cell} hidden text-right text-muted-foreground tabular-nums @lg:table-cell`}>
                <time dateTime={row.researchedAt} title={new Date(row.researchedAt).toLocaleString()}>
                  {timeAgo(row.researchedAt)}
                </time>
              </TableCell>
              <TableCell className={`${cell} pl-0 text-right`}>
                {row.reachable ? (
                  <ChevronRight
                    aria-hidden
                    className="ml-auto size-4 text-muted-foreground/60 transition-colors group-hover:text-foreground"
                  />
                ) : (
                  // Sits above the row's stretched link area
                  <Button asChild variant="outline" size="xs" className="relative z-10">
                    <Link to={retryPath(row.domain)} aria-label={`Try researching ${row.domain} again`}>
                      <RotateCw />
                      <span className="hidden @5xl:inline">Try again</span>
                    </Link>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Same column layout as the table, so nothing shifts when rows arrive. */
export function CompaniesTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden className="@container">
      <div className="flex h-9 items-center border-b px-3">
        <Skeleton className="h-3 w-16" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b px-3 py-3 last:border-0">
          <div className="flex-1 space-y-1.5 @3xl:flex-none @3xl:basis-1/5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-28 @3xl:hidden" />
          </div>
          <Skeleton className="hidden h-3.5 basis-1/4 @3xl:block" />
          <Skeleton className="hidden h-3.5 basis-1/6 @4xl:block" />
          <Skeleton className="ml-auto h-3.5 w-7" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="hidden h-3.5 w-20 @lg:block" />
          <Skeleton className="size-4" />
        </div>
      ))}
    </div>
  )
}
