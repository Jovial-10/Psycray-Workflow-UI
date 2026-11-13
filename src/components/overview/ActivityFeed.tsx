import { CircleAlert, CircleCheck, Globe, History, SearchX, type LucideIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { timeAgo, type ActivityEvent } from "@/lib/overview"
import type { ResearchJobStatus } from "@/types/research"

const outcome: Record<ResearchJobStatus, { icon: LucideIcon; verb: string; tone: string }> = {
  completed: { icon: CircleCheck, verb: "Researched", tone: "text-muted-foreground" },
  cached: { icon: History, verb: "Opened saved research for", tone: "text-muted-foreground" },
  not_found: { icon: SearchX, verb: "No website found for", tone: "text-warning" },
  unreachable: { icon: Globe, verb: "Couldn't reach", tone: "text-danger" },
  failed: { icon: CircleAlert, verb: "Research failed for", tone: "text-danger" },
  running: { icon: History, verb: "Researching", tone: "text-muted-foreground" },
}

/** Research requests as a log, newest first: what was run and how it ended. */
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="divide-y">
      {events.map((event) => {
        const { icon: Icon, verb, tone } = outcome[event.status]
        return (
          <li key={event.id} className="flex items-start gap-3 px-4 py-2.5 text-[13px] sm:items-center">
            <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0 sm:mt-0", tone)} />
            <p className="min-w-0 flex-1 break-words sm:truncate">
              {verb}{" "}
              <span
                className={cn("font-medium", event.subjectIsDomain && "font-mono text-xs font-normal")}
                title={event.subject}
              >
                {event.status === "not_found" ? `“${event.subject}”` : event.subject}
              </span>
            </p>
            <time
              dateTime={event.at}
              title={new Date(event.at).toLocaleString()}
              className="shrink-0 text-xs text-muted-foreground tabular-nums"
            >
              {timeAgo(event.at)}
            </time>
          </li>
        )
      })}
    </ol>
  )
}

export function ActivitySkeleton() {
  return (
    <div aria-hidden className="divide-y">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
      ))}
    </div>
  )
}
