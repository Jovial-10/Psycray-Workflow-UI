import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder with the same layout as ResearchResult, shown while research runs. */
export function ResultSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
