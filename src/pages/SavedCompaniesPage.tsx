import { Building2, Search } from "lucide-react"
import { Link } from "react-router"
import { EmptyState } from "@/components/common/EmptyState"
import { Button } from "@/components/ui/button"

export function SavedCompaniesPage() {
  return (
    <EmptyState
      icon={Building2}
      title="Research history isn't connected yet"
      description="Saved companies will list here with their fit tier, score and last research date. Research is still saved for 30 days, so repeat lookups return instantly."
      action={
        <Button variant="outline" asChild>
          <Link to="/research">
            <Search />
            Research a company
          </Link>
        </Button>
      }
    />
  )
}
