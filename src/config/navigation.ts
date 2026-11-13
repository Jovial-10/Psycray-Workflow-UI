import {
  Building2,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  /** One line shown next to the page title in the header. */
  description: string
  path: string
  icon: LucideIcon
  /** "main" items sit at the top of the sidebar; "secondary" above the user footer. */
  section: "main" | "secondary"
}

/** Single source of truth for navigation and page titles. Paths must match `app/router.tsx`. */
export const navItems: NavItem[] = [
  {
    title: "Overview",
    description: "Pipeline health across researched accounts",
    path: "/",
    icon: LayoutDashboard,
    section: "main",
  },
  {
    title: "Company Research",
    description: "Research a company by name or domain",
    path: "/research",
    icon: Search,
    section: "main",
  },
  {
    title: "Saved Companies",
    description: "Every company in the research cache",
    path: "/companies",
    icon: Building2,
    section: "main",
  },
  {
    title: "Account Briefs",
    description: "Sales-ready briefs for validated accounts",
    path: "/briefs",
    icon: FileText,
    section: "main",
  },
  {
    title: "Settings",
    description: "Appearance and workspace preferences",
    path: "/settings",
    icon: Settings,
    section: "secondary",
  },
]

/** The nav item for a pathname, or undefined for unknown routes. */
export function findNavItem(pathname: string) {
  return navItems.find((item) =>
    item.path === "/" ? pathname === "/" : pathname === item.path || pathname.startsWith(`${item.path}/`),
  )
}
