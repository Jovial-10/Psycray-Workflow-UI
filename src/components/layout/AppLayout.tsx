import { Outlet } from "react-router"
import { MobileNav } from "./MobileNav"
import { Sidebar } from "./Sidebar"

export function AppLayout() {
  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
