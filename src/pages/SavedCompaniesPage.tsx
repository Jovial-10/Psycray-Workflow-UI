import { Building2 } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { PlaceholderPanel } from "@/components/layout/PlaceholderPanel"

export function SavedCompaniesPage() {
  return (
    <>
      <PageHeader
        title="Saved Companies"
        description="Every company stored in the research cache."
      />
      <PlaceholderPanel
        icon={Building2}
        planned={[
          "Searchable table of researched domains",
          "ICP score, tier, status, and last-updated date",
          "Cache freshness (research older than 30 days is re-run)",
        ]}
      />
    </>
  )
}
