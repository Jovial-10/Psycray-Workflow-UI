import { useState, type FormEvent } from "react"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ResearchFormProps {
  onSubmit: (input: string) => void
  /** Disables the form while a request is in flight (prevents duplicates). */
  busy: boolean
}

export function ResearchForm({ onSubmit, busy }: ResearchFormProps) {
  const [value, setValue] = useState("")
  const trimmed = value.trim()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!busy && trimmed.length >= 2) onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Company name or website, e.g. acme.com"
        aria-label="Company name or website domain"
        maxLength={200}
        disabled={busy}
        className="h-10"
      />
      <Button type="submit" disabled={busy || trimmed.length < 2} className="h-10 sm:w-36">
        {busy ? <Loader2 className="animate-spin" /> : <Search />}
        {busy ? "Researching" : "Research"}
      </Button>
    </form>
  )
}
