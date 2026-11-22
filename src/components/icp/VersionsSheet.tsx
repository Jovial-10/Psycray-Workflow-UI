import { History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { IcpConfigVersion } from "@/types/research"

interface Props {
  versions: IcpConfigVersion[]
  activeId: number
  /** Id of a version whose settings equal the draft, if any. */
  draftMatches: number | null
  onLoad: (version: IcpConfigVersion) => void
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

/** Every published version, newest first. Loading one copies it into the draft; publishing makes it a new version. */
export function VersionsSheet({ versions, activeId, draftMatches, onLoad }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History />
          Versions
          <span className="text-muted-foreground tabular-nums">{versions.length}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Published versions</SheetTitle>
          <SheetDescription>
            Versions never change once published, so every score can be traced to the settings that produced it. Load
            one into the draft to start from it; publishing makes it a new version.
          </SheetDescription>
        </SheetHeader>
        <ol className="flex-1 divide-y overflow-y-auto">
          {versions.map((v) => (
            <li key={v.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[13px]">{v.label}</span>
                {v.id === activeId && <Badge variant="neutral">Active</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Version {v.version} · published by {v.published_by} · {when(v.published_at)}
              </p>
              {v.note && <p className="text-sm">{v.note}</p>}
              {v.change_summary.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {v.change_summary.map((c) => (
                    <li key={c.text}>{c.text}</li>
                  ))}
                </ul>
              )}
              <Button variant="outline" size="xs" disabled={draftMatches === v.id} onClick={() => onLoad(v)}>
                {draftMatches === v.id ? "Matches the draft" : "Load into draft"}
              </Button>
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  )
}
