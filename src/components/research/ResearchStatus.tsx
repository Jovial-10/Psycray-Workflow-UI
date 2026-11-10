import { useEffect, useState, type ReactNode } from "react"
import { AlertTriangle, Globe, Loader2, SearchX, XCircle, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SLOW_AFTER_MS, type ResearchState } from "@/hooks/useResearchJob"

interface ResearchStatusProps {
  state: ResearchState
  onRetry: () => void
}

/** Progress while research runs, and a clear message for every unsuccessful outcome. */
export function ResearchStatus({ state, onRetry }: ResearchStatusProps) {
  const { phase, job, error, startedAt } = state

  if (phase === "submitting" || phase === "running") {
    return <Running startedAt={startedAt} submitting={phase === "submitting"} />
  }

  if (phase === "error") {
    return (
      <Notice icon={XCircle} title="Something went wrong" onRetry={onRetry}>
        {error}
      </Notice>
    )
  }

  if (phase !== "done" || !job) return null

  switch (job.status) {
    case "not_found":
      return (
        <Notice icon={SearchX} title="Company could not be identified" onRetry={onRetry}>
          We couldn't find an official website for “{job.input}”. Try entering the company's website
          domain instead, e.g. <span className="font-medium">acme.com</span>.
        </Notice>
      )
    case "unreachable":
      return (
        <Notice icon={Globe} title="Website could not be reached" onRetry={onRetry}>
          {job.domain ? <span className="font-medium">{job.domain}</span> : "The website"} did not
          load or returned an error, so it could not be researched. Check the domain and try again.
        </Notice>
      )
    case "failed":
      return (
        <Notice icon={AlertTriangle} title="Research failed" onRetry={onRetry}>
          A research step failed before finishing. This is usually a temporary problem with an
          external service.
          {job.error && <span className="mt-2 block text-xs opacity-80">{job.error}</span>}
        </Notice>
      )
    case "completed":
    case "cached":
      return job.record ? null : (
        <Notice icon={AlertTriangle} title="Research finished without results" onRetry={onRetry}>
          The research job finished but no saved results were found for {job.domain ?? job.input}.
        </Notice>
      )
    default:
      return null
  }
}

function Running({ startedAt, submitting }: { startedAt: number | null; submitting: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
  const slow = elapsed * 1000 >= SLOW_AFTER_MS

  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-muted-foreground" />
        <div className="text-sm">
          <p className="font-medium">
            {submitting ? "Submitting request…" : "Researching company…"}
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">{elapsed}s</span>
          </p>
          <p className="mt-1 text-muted-foreground">
            {slow
              ? "This is taking longer than usual. Research continues in the background — you can keep this page open."
              : "Reading the website, gathering signals, scoring fit and writing the brief. Fresh research usually takes 30–90 seconds."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function Notice({
  icon: Icon,
  title,
  children,
  onRetry,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  onRetry: () => void
}) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="flex-1 text-sm">
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-muted-foreground">{children}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}
