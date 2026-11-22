import { ArrowRight, Monitor, Moon, Sun } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "@/hooks/useTheme"
import type { ThemePreference } from "@/lib/theme"
import { cn } from "@/lib/utils"

const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

export function SettingsPage() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle id="appearance-title">Appearance</CardTitle>
          <CardDescription>System follows your operating system's light or dark setting.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="radiogroup"
            aria-labelledby="appearance-title"
            className="inline-flex rounded-lg border bg-muted p-0.5"
          >
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const selected = preference === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPreference(value)}
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4",
                    selected && "bg-card text-foreground shadow-xs dark:bg-input/40",
                  )}
                >
                  <Icon />
                  {label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ICP scoring</CardTitle>
          <CardDescription>Weights, baseline, criteria and hard requirements are edited and versioned in ICP Studio.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/icp">
              Open ICP Studio
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
