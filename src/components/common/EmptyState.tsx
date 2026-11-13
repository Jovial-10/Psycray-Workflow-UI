import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: ReactNode
  /** Usually one Button (or Button asChild + Link) that resolves the empty state. */
  action?: ReactNode
  className?: string
}

/** Standard empty / not-yet-available state: icon, one-line title, explanation, next action. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Empty className={cn("rounded-xl border border-dashed bg-card/50 py-14", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-10 rounded-lg border bg-card text-muted-foreground [&_svg:not([class*='size-'])]:size-5">
          <Icon />
        </EmptyMedia>
        <EmptyTitle className="text-base font-semibold">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
