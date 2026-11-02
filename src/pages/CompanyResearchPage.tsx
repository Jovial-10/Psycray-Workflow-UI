import { Search } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { PlaceholderPanel } from "@/components/layout/PlaceholderPanel"

export function CompanyResearchPage() {
  return (
    <>
      <PageHeader
        title="Company Research"
        description="Research a company by name or domain using the n8n research agent."
      />
      <PlaceholderPanel
        icon={Search}
        planned={[
          "Input for a company name or website domain",
          "Run status: cached, completed, or unreachable",
          "Company facts, confirmed facts, inferences, and unknowns",
        ]}
      />
    </>
  )
}
