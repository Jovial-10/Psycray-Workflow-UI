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
  path: string
  icon: LucideIcon
}

/** Single source of truth for sidebar links. Paths must match `app/router.tsx`. */
export const navItems: NavItem[] = [
  { title: "Overview", path: "/", icon: LayoutDashboard },
  { title: "Company Research", path: "/research", icon: Search },
  { title: "Saved Companies", path: "/companies", icon: Building2 },
  { title: "Account Briefs", path: "/briefs", icon: FileText },
  { title: "Settings", path: "/settings", icon: Settings },
]
