import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/hooks/useTheme"

/** One-click switch between light and dark. "Follow system" lives in Settings. */
export function ThemeToggle() {
  const { resolved, setPreference } = useTheme()
  const next = resolved === "dark" ? "light" : "dark"
  const label = `Switch to ${next} theme`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={() => setPreference(next)}>
          {resolved === "dark" ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
