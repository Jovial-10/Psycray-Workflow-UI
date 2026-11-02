import { NavLink } from "react-router"
import { navItems } from "@/config/navigation"
import { cn } from "@/lib/utils"

/** Horizontal, scrollable nav shown below the `md` breakpoint in place of the sidebar. */
export function MobileNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b px-4 py-2 md:hidden">
      {navItems.map(({ title, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === "/"}
          className={({ isActive }) =>
            cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground",
              isActive && "bg-accent font-medium text-accent-foreground",
            )
          }
        >
          <Icon className="size-4" />
          {title}
        </NavLink>
      ))}
    </nav>
  )
}
