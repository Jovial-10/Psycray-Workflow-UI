import { FileText, Search } from "lucide-react"
import { Link } from "react-router"
import { EmptyState } from "@/components/common/EmptyState"
import { Button } from "@/components/ui/button"

export function AccountBriefsPage() {
  return (
    <EmptyState
      icon={FileText}
      title="Past briefs will open here"
      description="Every completed research run produces an account brief. Browsing them without re-running research arrives with research history; until then, briefs appear on Company Research."
      action={
        <Button variant="outline" asChild>
          <Link to="/research">
            <Search />
            Go to Company Research
          </Link>
        </Button>
      }
    />
  )
}
