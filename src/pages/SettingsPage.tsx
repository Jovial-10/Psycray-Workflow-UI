import { Settings } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { PlaceholderPanel } from "@/components/layout/PlaceholderPanel"

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure the connection to the research backend."
      />
      <PlaceholderPanel
        icon={Settings}
        planned={[
          "n8n workflow endpoint configuration",
          "Switch between mock data and the live backend",
          "ICP scoring reference (tier thresholds and weights)",
        ]}
      />
    </>
  )
}
