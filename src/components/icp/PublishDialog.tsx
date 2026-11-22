import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { describeConfigChanges, type IcpConfig } from "@/lib/scoring/icpEngine"
import { api, ApiError } from "@/services/api"
import type { IcpConfigVersion } from "@/types/research"
import { AdminSignIn } from "./AdminSignIn"

interface Props {
  active: IcpConfigVersion
  nextVersion: number
  draft: IcpConfig
  errors: string[]
  dirty: boolean
  admin: { key: string; name: string } | null
  onSignIn: (key: string) => Promise<string>
  onPublished: (version: IcpConfigVersion) => void
  /** Reload published versions after a conflict. */
  onReload: () => void
}

/** Review the change, add a note and publish a new immutable version. */
export function PublishDialog({ active, nextVersion, draft, errors, dirty, admin, onSignIn, onPublished, onReload }: Props) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [state, setState] = useState<{ pending: boolean; error: string | null; details: string[]; conflict: boolean }>({
    pending: false,
    error: null,
    details: [],
    conflict: false,
  })
  const changes = describeConfigChanges(active.config, draft)
  const blocked = !dirty || errors.length > 0

  async function publish() {
    if (!admin || blocked || state.pending) return
    setState({ pending: true, error: null, details: [], conflict: false })
    try {
      const version = await api.publishIcpConfig(admin.key, { config: draft, baseVersionId: active.id, note })
      setState({ pending: false, error: null, details: [], conflict: false })
      setNote("")
      setOpen(false)
      onPublished(version)
    } catch (err) {
      const e = err instanceof ApiError ? err : null
      setState({
        pending: false,
        error: err instanceof Error ? err.message : "Publishing failed.",
        details: e?.details ?? [],
        conflict: e?.status === 409,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!dirty}>
          <Upload />
          Publish
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish version {nextVersion}</DialogTitle>
          <DialogDescription>
            It becomes the active ICP for new and cached research and for recalculation. Existing scores keep the
            version they were calculated with until you recalculate them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Changes from {active.label}</p>
            {changes.length ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                {changes.map((c) => (
                  <li key={c.text}>{c.text}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">No changes.</p>
            )}
          </div>

          {errors.length > 0 && (
            <div role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-danger-foreground">
              <p className="font-medium">Fix these before publishing</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="icp-note">Note</Label>
            <Textarea
              id="icp-note"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this change? e.g. Weight hiring more for Q1 outbound"
              className="min-h-20 md:text-sm"
            />
          </div>

          {admin ? (
            <p className="text-xs text-muted-foreground">Publishing as {admin.name}.</p>
          ) : (
            <AdminSignIn onSignIn={onSignIn} />
          )}

          {state.error && (
            <div role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-xs text-danger-foreground">
              <p>{state.error}</p>
              {state.details.length > 0 && (
                <ul className="mt-1 list-disc pl-4">
                  {state.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
              {state.conflict && (
                <Button variant="outline" size="xs" className="mt-2" onClick={onReload}>
                  Load the newer version
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={publish} disabled={!admin || blocked || state.pending}>
            {state.pending ? "Publishing…" : `Publish version ${nextVersion}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
