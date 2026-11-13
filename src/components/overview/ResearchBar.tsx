import { useRef, useState, type FormEvent } from "react"
import { ArrowRight, Search } from "lucide-react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** Starts a research run: hands the input to Company Research, which begins immediately. */
export function ResearchBar() {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const trimmed = value.trim()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (trimmed.length >= 2) navigate(`/research?q=${encodeURIComponent(trimmed)}`)
    else inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 sm:p-5">
      <label htmlFor="overview-research" className="text-sm font-medium">
        Research a company
      </label>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Enter a company name or website. Research takes about 30 seconds; saved results return instantly.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            id="overview-research"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="acme.com or Acme Manufacturing"
            maxLength={200}
            autoComplete="off"
            className="h-10 pl-9"
          />
        </div>
        <Button type="submit" className="h-10 sm:px-5">
          Research Company
          <ArrowRight />
        </Button>
      </div>
    </form>
  )
}
