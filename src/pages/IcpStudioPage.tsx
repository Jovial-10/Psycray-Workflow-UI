import { useEffect, useState } from "react"
import { CircleCheck, RotateCcw, RotateCw, Undo2 } from "lucide-react"
import { useSearchParams } from "react-router"
import { EmptyState } from "@/components/common/EmptyState"
import { CriteriaCard } from "@/components/icp/CriteriaCard"
import { PreviewCard } from "@/components/icp/PreviewCard"
import { PublishDialog } from "@/components/icp/PublishDialog"
import { RecalculateCard } from "@/components/icp/RecalculateCard"
import { RequirementsCard } from "@/components/icp/RequirementsCard"
import { VersionsSheet } from "@/components/icp/VersionsSheet"
import { WeightsCard } from "@/components/icp/WeightsCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompanies } from "@/hooks/useCompanies"
import { useIcpConfig } from "@/hooks/useIcpConfig"
import { hasEvidence, previewCompany, sameConfig } from "@/lib/icpStudio"
import { DEFAULT_ICP_CONFIG, ICP_ALGORITHM_VERSION, validateConfig, type IcpConfig } from "@/lib/scoring/icpEngine"
import type { IcpConfigVersion } from "@/types/research"

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

/**
 * ICP Studio: edit a draft of the ICP, preview it on a saved company, publish
 * it as a new immutable version, and recalculate saved companies.
 */
export function IcpStudioPage() {
  const icp = useIcpConfig()
  const companies = useCompanies()
  const [params, setParams] = useSearchParams()
  const [published, setPublished] = useState<IcpConfigVersion | null>(null)

  const active = icp.status === "ready" ? icp.config.versions.find((v) => v.id === icp.config.profile.active_version_id) ?? null : null
  // The draft starts from the active version; `base` is the version it was based on
  const [draftState, setDraftState] = useState<{ base: number; config: IcpConfig } | null>(null)
  const draft = draftState && active && draftState.base === active.id ? draftState.config : active?.config ?? null
  const setDraft = (config: IcpConfig) => active && setDraftState({ base: active.id, config })

  const dirty = !!draft && !!active && !sameConfig(draft, active.config)
  const errors = draft ? validateConfig(draft) : []

  // Keep unsaved work from vanishing on reload or tab close
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const records = companies.status === "ready" ? companies.list.records : []
  const withEvidence = records.filter(hasEvidence)
  const legacy = records.filter((r) => r.status === "validated" && !hasEvidence(r)).length
  const selectedDomain = params.get("company")
  const previewRecord = withEvidence.find((r) => r.domain === selectedDomain) ?? withEvidence[0] ?? null
  // Cheap (one engine run per side), so it is recomputed on every edit
  const preview = previewRecord && active && draft ? previewCompany(previewRecord, active.config, active.id, draft) : null
  const outdated = active
    ? withEvidence.filter((r) => r.icp_scoring?.config_version !== active.label || r.icp_scoring?.algorithm_version !== ICP_ALGORITHM_VERSION).length
    : 0

  if (icp.status === "error") {
    return (
      <EmptyState
        icon={RotateCw}
        title="The ICP configuration couldn't load"
        description={icp.error}
        action={
          <Button variant="outline" onClick={icp.reload}>
            <RotateCw />
            Try again
          </Button>
        }
      />
    )
  }

  if (!active || !draft || icp.status !== "ready") return <StudioSkeleton />

  const nextVersion = Math.max(...icp.config.versions.map((v) => v.version)) + 1
  const matching = icp.config.versions.find((v) => sameConfig(v.config, draft))?.id ?? null
  const previewName = previewRecord?.synthesized_research?.company_name || previewRecord?.domain || null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active version</span>
            <span className="font-mono text-[13px]">{active.label}</span>
            {dirty && <Badge variant="warning">Unsaved changes</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">
            Version {active.version} · published by {active.published_by} · {when(active.published_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VersionsSheet
            versions={icp.config.versions}
            activeId={active.id}
            draftMatches={matching}
            onLoad={(v) => setDraft({ ...v.config, version: active.config.version })}
          />
          <Button variant="outline" size="sm" onClick={() => setDraft({ ...DEFAULT_ICP_CONFIG, version: active.config.version })} disabled={sameConfig(draft, DEFAULT_ICP_CONFIG)}>
            <RotateCcw />
            Reset to defaults
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDraftState(null)} disabled={!dirty}>
            <Undo2 />
            Discard
          </Button>
          <PublishDialog
            active={active}
            nextVersion={nextVersion}
            draft={draft}
            errors={errors}
            dirty={dirty}
            onReload={icp.reload}
            onPublished={(v) => {
              setPublished(v)
              setDraftState(null)
              icp.reload()
            }}
          />
        </div>
      </div>

      {published && published.id === active.id && (
        <div role="status" className="flex flex-wrap items-start gap-3 rounded-xl border border-success-border bg-success-soft px-4 py-3 text-sm text-success-foreground">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="min-w-0 flex-1">
            Published <span className="font-mono text-[13px]">{published.label}</span>. New research uses it now. Saved
            scores keep their version until you recalculate them below.
          </p>
        </div>
      )}

      {dirty && errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-foreground">
          <p className="font-medium">This draft can't be published yet</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <WeightsCard draft={draft} onChange={setDraft} previewCriteria={preview?.draft?.criteria ?? null} previewName={previewName} />
          <CriteriaCard draft={draft} onChange={setDraft} />
          <RequirementsCard draft={draft} onChange={setDraft} />
        </div>
        <div className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto lg:pb-1">
          {companies.status === "loading" ? (
            <Skeleton className="h-72 rounded-xl" />
          ) : (
            <PreviewCard
              companies={withEvidence}
              legacyCount={legacy}
              record={previewRecord}
              onSelect={(domain) =>
                setParams(
                  (p) => {
                    const next = new URLSearchParams(p)
                    next.set("company", domain)
                    return next
                  },
                  { replace: true },
                )
              }
              preview={preview}
              dirty={dirty}
              publishedLabel={active.label}
            />
          )}
          <RecalculateCard
            publishedLabel={active.label}
            outdated={outdated}
            legacy={legacy}
            onDone={companies.reload}
          />
        </div>
      </div>

    </div>
  )
}

function StudioSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading the ICP configuration">
      <div className="flex justify-between gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-8 w-80" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-[32rem] rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}
