import { NavLink } from "react-router"
import { navItems } from "@/config/navigation"
import { cn } from "@/lib/utils"

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
          P
        </div>
        <span className="text-sm font-semibold tracking-tight">Psycray Intelligence</span>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {navItems.map(({ title, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )
            }
          >
            <Icon className="size-4" />
            {title}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
