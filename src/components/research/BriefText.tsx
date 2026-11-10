import type { ReactNode } from "react"

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

    // "### Heading", "**Heading**", or "1. Company Summary" style section titles
    const heading =
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

/** **bold** → <strong>; everything else as plain text. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-medium text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}
