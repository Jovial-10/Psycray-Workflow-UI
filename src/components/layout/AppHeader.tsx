import { useLocation } from "react-router"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { findNavItem } from "@/config/navigation"
import { apiMode } from "@/services/api"

/** Sticky top bar: sidebar toggle, page title, environment and theme controls. */
export function AppHeader() {
  const { pathname } = useLocation()
  const item = findNavItem(pathname)

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 md:px-6">
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger className="-ml-1.5 text-muted-foreground hover:text-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          Toggle sidebar <kbd className="ml-1 font-sans opacity-70">⌘B</kbd>
        </TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />

      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <h1 className="truncate text-sm font-semibold tracking-tight">{item?.title ?? "Page not found"}</h1>
        {item && (
          <p className="hidden truncate text-[13px] text-muted-foreground md:block">{item.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {apiMode === "mock" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="warning" tabIndex={0} className="cursor-default">
                Sample data
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              Research results are fictional sample data. Set VITE_API_MODE=live to use the n8n workflow.
            </TooltipContent>
          </Tooltip>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
