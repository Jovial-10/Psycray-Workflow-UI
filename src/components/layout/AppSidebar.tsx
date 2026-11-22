import { X } from "lucide-react"
import { Link, NavLink, useLocation } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { findNavItem, navItems, type NavItem } from "@/config/navigation"

/**
 * Collapsible app sidebar. On desktop it collapses to an icon rail
 * (⌘/Ctrl+B or the header button); below `md` it becomes a drawer.
 */
export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 flex-row items-center border-b border-sidebar-border">
        <Brand />
        <DrawerClose />
      </SidebarHeader>

      <SidebarContent>
        <NavGroup items={navItems.filter((i) => i.section === "main")} />
        <NavGroup items={navItems.filter((i) => i.section === "secondary")} className="mt-auto" />
      </SidebarContent>


      <SidebarRail />
    </Sidebar>
  )
}

function Brand() {
  const { isMobile, setOpenMobile } = useSidebar()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild tooltip="Psycray" className="hover:bg-transparent active:bg-transparent">
          <Link to="/" onClick={() => isMobile && setOpenMobile(false)}>
            {/* Monogram stands in for a logo until Psycray provides one */}
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-[13px] font-semibold text-background"
            >
              P
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">Psycray</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/** Close button shown only inside the mobile drawer (desktop collapses instead). */
function DrawerClose() {
  const { isMobile, setOpenMobile } = useSidebar()
  if (!isMobile) return null
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Close navigation" onClick={() => setOpenMobile(false)}>
      <X />
    </Button>
  )
}

function NavGroup({ items, className }: { items: NavItem[]; className?: string }) {
  const { pathname } = useLocation()
  const active = findNavItem(pathname)
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild isActive={active?.path === item.path} tooltip={item.title}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  onClick={() => isMobile && setOpenMobile(false)}
                  className="text-[13.5px] data-[active=true]:[&>svg]:text-primary"
                >
                  <item.icon />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
