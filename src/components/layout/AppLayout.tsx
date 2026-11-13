import { Outlet } from "react-router"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppHeader } from "./AppHeader"
import { AppSidebar } from "./AppSidebar"

/** The sidebar component remembers its state in this cookie; read it back on load. */
function sidebarWasOpen() {
  return !document.cookie.split("; ").includes("sidebar_state=false")
}

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={sidebarWasOpen()}>
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div id="content" tabIndex={-1} className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-6 outline-none md:px-8 md:py-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
