import { Badge } from "@/components/ui/badge"
import type { Qualification } from "@/lib/scoring/icpEngine"
import { cn } from "@/lib/utils"

const style: Record<Exclude<Qualification, "no_requirements">, { label: string; variant: "success" | "danger" | "neutral"; dot: string }> = {
  qualified: { label: "Meets requirements", variant: "success", dot: "bg-success" },
  disqualified: { label: "Fails a requirement", variant: "danger", dot: "bg-danger" },
  // Unknown is not failure: neutral, never a verdict hue
  unverified: { label: "Requirements unverified", variant: "neutral", dot: "bg-muted-foreground" },
}

/** Hard-requirement outcome, shown beside the fit tier. Nothing when no requirements are set. */
export function QualificationBadge({ qualification, className }: { qualification: Qualification | null; className?: string }) {
  if (!qualification || qualification === "no_requirements") return null
  const { label, variant, dot } = style[qualification]
  return (
    <Badge variant={variant} className={cn("gap-1.5", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </Badge>
  )
}
