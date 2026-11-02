import { FileText } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { PlaceholderPanel } from "@/components/layout/PlaceholderPanel"

export function AccountBriefsPage() {
  return (
    <>
      <PageHeader
        title="Account Briefs"
        description="Sales-ready briefs generated for validated accounts."
      />
      <PlaceholderPanel
        icon={FileText}
        planned={[
          "List of briefs filtered by ICP tier",
          "Readable brief view with the eight standard sections",
          "Source links and evidence for each brief",
        ]}
      />
    </>
  )
}
