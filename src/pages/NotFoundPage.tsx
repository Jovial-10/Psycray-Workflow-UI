import { Compass } from "lucide-react"
import { Link } from "react-router"
import { EmptyState } from "@/components/common/EmptyState"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="This page doesn't exist"
      description="The link may be out of date. Use the sidebar, or head back to the overview."
      action={
        <Button variant="outline" asChild>
          <Link to="/">Back to Overview</Link>
        </Button>
      }
    />
  )
}
