import type { ReactNode } from "react"
import { ACCOUNT_BRIEF_SECTIONS } from "@/types/research"

const sectionTitles = new Set<string>(ACCOUNT_BRIEF_SECTIONS.map((s) => s.toLowerCase()))

/**
 * Renders the model-written account brief (loose markdown) as readable text.
 * Handles only what the brief uses: headings, numbered section titles,
 * bullet lists and **bold**. Everything else is shown as a paragraph.
 */
export function BriefText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []

  const flushList = () => {
    if (list.length === 0) return
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
        {list.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>,
    )
    list = []
  }

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim()
    // The page already shows the company name; skip the brief's own title line
    if (/^#*\s*\**account brief:/i.test(line)) continue
    if (!line) {
      flushList()
      continue
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/)
    if (bullet) {
      list.push(bullet[1])
      continue
    }
    flushList()

    // "### Heading", "**Heading**", "1. Company Summary", or a bare standard section title
    const heading =
      (sectionTitles.has(line.replace(/[:*]/g, "").trim().toLowerCase()) ? line : undefined) ??
      line.match(/^#{1,6}\s+(.*)$/)?.[1] ??
      line.match(/^\*\*([^*]+)\*\*:?$/)?.[1] ??
      line.match(/^\d+\.\s+\**([A-Z][^.]{2,60}?)\**:?$/)?.[1]
    if (heading) {
      blocks.push(
        <h3 key={`h-${blocks.length}`} className="pt-2 font-semibold text-foreground">
          {heading.replace(/\*\*/g, "").replace(/^\d+\.\s*/, "")}
        </h3>,
      )
      continue
    }

    blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>)
  }
  flushList()

  return <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{blocks}</div>
}

/** **bold** → <strong>, [text](https://…) → link; everything else as plain text. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
    if (link) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
          {link[1]}
        </a>
      )
    }
    return part
  })
}
