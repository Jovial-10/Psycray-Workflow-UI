import { LayoutDashboard, Search } from "lucide-react"
import { Link } from "react-router"
import { EmptyState } from "@/components/common/EmptyState"
import { Button } from "@/components/ui/button"

export function OverviewPage() {
  return (
    <EmptyState
      icon={LayoutDashboard}
      title="Pipeline overview is on its way"
      description="Once research history is connected, this page will summarize researched companies by fit tier and flag websites that need another look."
      action={
        <Button asChild>
          <Link to="/research">
            <Search />
            Research a company
          </Link>
        </Button>
      }
    />
  )
}
