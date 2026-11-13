import { FitBadge } from "@/components/research/FitBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { timeAgo, type CompanyRow } from "@/lib/overview"

const head = "h-9 px-3 text-xs font-medium text-muted-foreground"
const cell = "px-3 py-2.5"

/**
 * Compact table of recently researched companies.
 * Columns respond to the table's own width (container queries), because the
 * sidebar changes how much room it has: domain moves under the name when
 * narrow; industry and date drop out first.
 */
export function RecentCompaniesTable({ rows }: { rows: CompanyRow[] }) {
  return (
    <div className="@container">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={head}>Company</TableHead>
            <TableHead className={`${head} hidden @2xl:table-cell`}>Domain</TableHead>
            <TableHead className={`${head} hidden @4xl:table-cell`}>Industry</TableHead>
            <TableHead className={`${head} text-right`}>ICP</TableHead>
            <TableHead className={head}>Fit</TableHead>
            <TableHead className={`${head} hidden text-right @lg:table-cell`}>Researched</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.domain} className="hover:bg-muted/40">
              {/* Below @2xl the cell takes the spare width (w-full + max-w-0) so the stacked domain truncates to it */}
              <TableCell className={`${cell} w-full max-w-0 whitespace-normal @2xl:w-auto @2xl:max-w-none`}>
                <span className="font-medium">{row.name}</span>
                <span
                  title={row.domain}
                  className="block truncate font-mono text-xs text-muted-foreground @2xl:hidden"
                >
                  {row.domain}
                </span>
              </TableCell>
              <TableCell className={`${cell} hidden font-mono text-[13px] text-muted-foreground @2xl:table-cell`}>
                {row.domain}
              </TableCell>
              <TableCell className={`${cell} hidden text-muted-foreground @4xl:table-cell`}>
                {row.industry ?? "—"}
              </TableCell>
              <TableCell className={`${cell} text-right font-medium tabular-nums`}>
                {row.score ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className={cell}>{row.tier ? <FitBadge tier={row.tier} /> : "—"}</TableCell>
              <TableCell className={`${cell} hidden text-right text-muted-foreground tabular-nums @lg:table-cell`}>
                <time dateTime={row.researchedAt} title={new Date(row.researchedAt).toLocaleString()}>
                  {timeAgo(row.researchedAt)}
                </time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Same column layout as the table, so nothing shifts when rows arrive. */
export function RecentCompaniesSkeleton() {
  return (
    <div aria-hidden className="@container">
      <div className="flex h-9 items-center border-b px-3">
        <Skeleton className="h-3 w-16" />
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b px-3 py-3 last:border-0">
          <div className="flex-1 space-y-1.5 @2xl:flex-none @2xl:basis-1/5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-28 @2xl:hidden" />
          </div>
          <Skeleton className="hidden h-3.5 basis-1/4 @2xl:block" />
          <Skeleton className="hidden h-3.5 basis-1/6 @4xl:block" />
          <Skeleton className="ml-auto h-3.5 w-7 @2xl:ml-auto" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="hidden h-3.5 w-20 @lg:block" />
        </div>
      ))}
    </div>
  )
}
