import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PlaceholderPanelProps {
  icon: LucideIcon
  /** Features planned for this page in later phases. */
  planned: string[]
}

/** Temporary content for routes that are scaffolded but not yet built. */
export function PlaceholderPanel({ icon: Icon, planned }: PlaceholderPanelProps) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <CardTitle className="flex items-center gap-2">
          Coming soon <Badge variant="secondary">Placeholder</Badge>
        </CardTitle>
        <CardDescription>This page is scaffolded. Planned functionality:</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
