import { useState } from "react"
import { Archive, ArchiveRestore, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ChangeText } from "@/components/common/ChangeValue"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { api } from "@/services/api"
import type { IcpConfigVersion } from "@/types/research"

interface Props {
  versions: IcpConfigVersion[]
  activeId: number
  /** Id of a version whose settings equal the draft, if any. */
  draftMatches: number | null
  onLoad: (version: IcpConfigVersion) => void
  /** Reload versions after archiving or restoring. */
  onChanged: () => void
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

/**
 * Every published version, newest first. Loading one copies it into the draft;
 * publishing makes it a new version. Archiving hides a version (it is never
 * deleted, so scores calculated with it stay explainable). Version 1 and the
 * active version can't be archived.
 */
export function VersionsSheet({ versions, activeId, draftMatches, onLoad, onChanged }: Props) {
  const [showArchived, setShowArchived] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const archivedCount = versions.filter((v) => v.archived_at).length
  const shown = versions.filter((v) => showArchived || !v.archived_at)

  async function setArchived(v: IcpConfigVersion, archived: boolean) {
    if (busy !== null) return
    setBusy(v.id)
    setError(null)
    try {
      await api.archiveIcpVersion(v.id, archived)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History />
          Versions
          <span className="text-muted-foreground tabular-nums">{versions.length - archivedCount}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Published versions</SheetTitle>
          <SheetDescription>
            Versions never change once published, so every score can be traced to the settings that produced it. Load
            one into the draft to start from it; publishing makes it a new version. Archiving hides a version but keeps
            it for the scores that used it.
          </SheetDescription>
          {archivedCount > 0 && (
            <Button variant="ghost" size="xs" className="self-start" aria-pressed={showArchived} onClick={() => setShowArchived((s) => !s)}>
              {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
            </Button>
          )}
        </SheetHeader>
        {error && (
          <p role="alert" className="mx-4 mt-3 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-xs text-danger-foreground">
            {error}
          </p>
        )}
        <ol className="flex-1 divide-y overflow-y-auto">
          {shown.map((v) => {
            const isActive = v.id === activeId
            const archivable = v.version > 1 && !isActive
            return (
              <li key={v.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[13px]">{v.label}</span>
                  {isActive && <Badge variant="neutral">Active</Badge>}
                  {v.version === 1 && <Badge variant="neutral">Original</Badge>}
                  {v.archived_at && <Badge variant="neutral">Archived</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Version {v.version} · published by {v.published_by} · {when(v.published_at)}
                </p>
                {v.note && <p className="text-sm">{v.note}</p>}
                {v.change_summary.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                    {v.change_summary.map((c) => (
                      <li key={c.text}>
                        <ChangeText text={c.text} />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  {v.archived_at ? (
                    <Button variant="outline" size="xs" disabled={busy !== null} onClick={() => setArchived(v, false)}>
                      <ArchiveRestore />
                      {busy === v.id ? "Restoring…" : "Restore"}
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="xs" disabled={draftMatches === v.id} onClick={() => onLoad(v)}>
                        {draftMatches === v.id ? "Matches the draft" : "Load into draft"}
                      </Button>
                      {archivable && (
                        <Button variant="ghost" size="xs" disabled={busy !== null} onClick={() => setArchived(v, true)} className="text-muted-foreground">
                          <Archive />
                          {busy === v.id ? "Archiving…" : "Archive"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </SheetContent>
    </Sheet>
  )
}
