import { LayoutDashboard } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { PlaceholderPanel } from "@/components/layout/PlaceholderPanel"

export function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Pipeline health at a glance across all researched accounts."
      />
      <PlaceholderPanel
        icon={LayoutDashboard}
        planned={[
          "Counts of researched companies by ICP tier",
          "Recently researched and recently cached accounts",
          "Companies whose website was unreachable and need review",
        ]}
      />
    </>
  )
}
