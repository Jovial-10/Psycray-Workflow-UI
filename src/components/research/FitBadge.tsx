import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { IcpTier } from "@/types/research"

const tierStyle: Record<IcpTier, { variant: "success" | "warning" | "danger" | "neutral"; dot: string }> = {
  "High Fit": { variant: "success", dot: "bg-success" },
  "Moderate Fit": { variant: "warning", dot: "bg-warning" },
  "Low Fit": { variant: "danger", dot: "bg-danger" },
  "Needs Review": { variant: "neutral", dot: "bg-muted-foreground" },
}

/** ICP tier as a colored badge: emerald High, amber Moderate, red Low, slate Needs Review. */
export function FitBadge({ tier, className }: { tier: IcpTier; className?: string }) {
  const { variant, dot } = tierStyle[tier]
  return (
    <Badge variant={variant} className={cn("gap-1.5", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {tier}
    </Badge>
  )
}
