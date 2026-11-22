import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Named admin key entry. The server checks the key; the browser only keeps it for this tab. */
export function AdminSignIn({ onSignIn, autoFocus }: { onSignIn: (key: string) => Promise<string>; autoFocus?: boolean }) {
  const [key, setKey] = useState("")
  const [state, setState] = useState<{ pending: boolean; error: string | null }>({ pending: false, error: null })

  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!key.trim() || state.pending) return
        setState({ pending: true, error: null })
        try {
          await onSignIn(key)
          setKey("")
          setState({ pending: false, error: null })
        } catch (err) {
          setState({ pending: false, error: err instanceof Error ? err.message : "That key wasn't accepted." })
        }
      }}
    >
      <Label htmlFor="icp-admin-key">Admin key</Label>
      <div className="flex gap-2">
        <Input
          id="icp-admin-key"
          type="password"
          autoComplete="off"
          autoFocus={autoFocus}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          aria-invalid={state.error ? true : undefined}
          aria-describedby="icp-admin-key-help"
          className="md:text-sm"
        />
        <Button type="submit" variant="outline" disabled={!key.trim() || state.pending}>
          {state.pending ? "Checking…" : "Sign in"}
        </Button>
      </div>
      <p id="icp-admin-key-help" className={state.error ? "text-xs text-danger-foreground" : "text-xs text-muted-foreground"}>
        {state.error ?? "Your personal key from a Psycray admin. Kept for this tab only."}
      </p>
    </form>
  )
}
