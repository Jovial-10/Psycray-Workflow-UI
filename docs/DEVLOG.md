# Development Log

Major changes and decisions, plus what comes next. Newest entries first.

**Contents:** [Current status](#current-status) · [Next steps](#next-steps) ·
[Open questions](#open-questions) · [Log](#log)

---

## Current status

| | |
| --- | --- |
| **Phase** | 2.1: frontend and research dashboard |
| **State** | ✅ **Phase 2.1a done.** All 5 cases pass end to end on real n8n |
| **Next** | Research history (Phase 2.1b). Decide on the scoring quick fix |
| **Design** | Design system and app shell done (zinc + deep indigo, Geist, light/dark). See [DESIGN.md](../DESIGN.md) |
| **Data source** | Live n8n via `/api` (`VITE_API_MODE=mock` for mock data) |

---

## Next steps

### Phase 2.1a: live research flow (current)

- [x] Audit the frontend and analyze the workflow (`versionId 0148a98e`)
- [x] API contract and architecture: proxy plus asynchronous jobs ([INTEGRATION.md](INTEGRATION.md))
- [x] `research_jobs` migration and `icp_breakdown` column
- [x] n8n v2 agent and API workflows (generated, structure and code checked)
- [x] Frontend: HTTP client, zod validation, job polling, results view
- [x] Tested against a fake n8n: proxy, secret header, every job outcome, malformed LLM fields
- [x] n8n setup steps 1–7 and `.env.local`
- [x] Auth: requests without the key or with a wrong key get 403
- [x] API through proxy: 202 / 400 / 404, and failed jobs report the step that broke
- [x] **Real n8n, end to end in the UI:** unreachable domain ✅ · invalid name ✅
- [x] Re-imported Agent v2 → Bug 1 fixed: **valid domain ✅ · cached ✅**
- [x] Bug 2 diagnosed and fixed in the file (no `URL` global in n8n's Code sandbox)
- [x] Re-imported Agent v2 → **company name ✅** ("Zapier" → zapier.com, fresh with `refresh: true`)
- [ ] Scoring misses obvious fits (Basecamp scored 20). Fix in Phase 2.2 or as a quick patch, your call
- [ ] Growth signals pick up other companies with the same name (e.g. Basecamp Research)
- [ ] Measure real run times and adjust the "taking longer than usual" threshold (90 s)

### Phase 2.1b: rest of the dashboard

- [ ] Research history: `GET /companies`, `GET /companies/:domain` and `GET /research/jobs` (n8n API workflow). This replaces Overview's sample data and powers Saved Companies
- [ ] Open a past Account Brief from history without re-running research
- [ ] Structured brief: confirmed facts vs inferences, signals with dates, source per claim
- [ ] Access control (login) before public hosting
- [ ] Deploy to the Psycray VPS (nginx config in [INTEGRATION.md](INTEGRATION.md#production-vps))

### Later

- [ ] Phase 2.2: configurable ICP (criteria, weights, hard requirements, recalculation)
- [ ] Phase 2.3: historical win/loss analysis (optional)

---

## Open questions

| # | Question | Status |
| --- | --- | --- |
| 1 | Hosting | ✅ Psycray VPS → nginx reverse proxy |
| 2 | n8n | ✅ Self-hosted on Elestio |
| 3 | `research_jobs` table | ✅ Approved |
| 4 | Login | ⏸ After end-to-end testing |
| 5 | Test webhook secret in `.env.local` | ✅ Done |
| 6 | Exa output for "Zapier" | ✅ One item per result (`id`, `url`, `title`, `author`) |
| 7 | A working `N8N_API_KEY` (current value is rejected with 401) | Open, optional |

---

## Log

### 2026-11-12 · Overview dashboard (Phase 3)

**Your decisions:** Overview shows labelled **sample data** even in live mode
until a history endpoint exists · "Research Company" **starts research
immediately** on the research page · "Recently researched" = **last 7 days** ·
table and activity **stacked** (six columns don't fit beside activity) ·
one more fix round after review.

**Built**

- **Research bar:** goes to `/research?q=…`, which starts the run at once.
  Submitting it empty focuses the input. `useResearchJob` was made safe for
  React StrictMode's double mount, which would otherwise have cancelled a run
  started on mount.
- **Metrics** (`src/lib/overview.ts`), all derived from the records:
  researched (+ unreachable), high-fit (with share), average ICP (with count
  scored), last 7 days. Checked against a hand calculation: 12 (+2) · 4 (33%)
  · 70 across 11 · 7.
- **Recent companies table:** columns respond to the table's own width, since
  the sidebar changes the space available. All six columns show from 1280px.
  On narrow widths the domain moves under the name and truncates to the cell.
  Overflow is 0px at 360 to 1440px.
- **Recent activity:** a log of research *requests* and outcomes (reopened
  saved research, no website found, unreachable, failed), from a new mock
  `research_jobs` log. It complements the table instead of repeating it.
- **States:** loading skeletons that mirror the layout (0px shift when data
  arrives), an error state with retry, and an empty state (no notice over an
  empty list).
- **Data:** 14 fictional companies (dates relative to today, scores built
  with the n8n scoring rules), a mock job log, and `listCompanies` /
  `listResearchJobs` on the API. The live client serves the sample set until
  the n8n endpoints exist. The header badge now says "Sample data".
- **Design system:** added the `table` component and a compact-metric type
  step in DESIGN.md.

**Review:** the independent finish review ran three rounds (8 fixes, then 3
small mobile and tablet follow-ups you approved). Final verdict: *ship*.
Detector clean. Typecheck, lint and build pass.

### 2026-11-12 · Design system and application shell

Built with the **impeccable** design plugin. Product facts went into
`PRODUCT.md`. The design direction was pinned by the brief (Linear / Vercel /
Untitled UI; zinc, deep indigo, Geist), so no direction exploration ran.

**Decisions** (your answers): Geist · zinc neutrals · theme follows the OS ·
plain "Psycray" wordmark, no invented logo · placeholder user in the footer ·
48px collapsed rail (accepted after review).

**Built**

- **Tokens** (`src/index.css`): light uses a zinc-50 background and white
  cards. Dark uses zinc-950 / 900 / 800. The accent is a deep indigo
  (`#3c45b1` light, `#5462ca` dark). Fit tiers have semantic
  success / warning / danger tokens. Selection, scrollbars and the text
  cursor are themed, and motion respects reduced-motion settings.
- **Shell:** shadcn `sidebar` (240px, collapsing to a 48px rail with ⌘B,
  state kept in a cookie, drawer below 768px with a close button), a sticky
  header (page title and description, a focusable "Mock data" indicator, the
  theme toggle), a skip link, and content capped at 1120px.
- **Theme:** a pre-paint script avoids a flash of the wrong theme. The choice
  is remembered, and Settings → Appearance offers Light / Dark / System.
- **Components:** cards use a border only. Badges gained
  success / warning / danger / neutral. New: `FitBadge`, `EmptyState`,
  `ResultSkeleton`.
- **Pages:** honest empty states with a next action. Company Research shows a
  skeleton while research runs, brief section headings, and sources in
  Geist Mono.
- **Removed:** the old `Sidebar`, `MobileNav`, `PageHeader` and
  `PlaceholderPanel`.

**Review:** an independent finish review returned *fix* (8 items). All were
applied and confirmed resolved over two rounds, including lowering an accent
that read as electric violet. The design detector found no issues. Typecheck,
lint and build pass, with no console errors.

**Lost:** the n8n workflow generator script lived in a temporary folder that
was cleared. Future workflow fixes edit
`n8n/workflows/psycray-research-agent-v2.json` directly.

### 2026-11-10 · All end-to-end cases pass

| Case | Input | Result | Time |
| --- | --- | --- | --- |
| Valid domain | `basecamp.com` | ✅ `completed` | ~25 s |
| Company name | `Zapier` (refresh) | ✅ `completed` → zapier.com, 100 High Fit | 23 s |
| Cached company | `basecamp.com` | ✅ `cached` | 4 s |
| Unreachable | `psycray-no-such-domain-8841.com` | ✅ `unreachable` | 4 s |
| Unidentifiable | `Qwxzv Plorptex Holdings` | ✅ `not_found` | 4 s |

- Refresh (`refresh: true`) skips the cache as intended.
- Fresh runs take 23–25 s, well under the 90 s "taking longer than
  usual" threshold.
- Rows saved by older workflow versions have no `icp_breakdown`. The UI
  shows a "refresh to generate" message for those.

### 2026-11-10 · Fresh and cached research work on real n8n

| Case | Result | Time |
| --- | --- | --- |
| `basecamp.com` (fresh) | `completed` ✅: facts, ICP breakdown, 6 sources, 1.8k-character brief | ~25 s |
| `basecamp.com` (again) | `cached` ✅ | 4 s |
| `Zapier` | `not_found` ❌ → fixed in file, waiting for re-import | 4 s |

- **Bug 2, cause:** *Rank Website Candidates* called `new URL()`. n8n's Code
  sandbox doesn't provide `URL`, so every result threw, the `catch` skipped
  it, and no candidates were left. The original workflow's `items[0].url`
  fallback hid this. Hostnames are now parsed with a regex, and the fix is
  tested with `URL` undefined.
- **UI, checked with real data:** profile, scorecard reasons, all 8 brief
  sections and sources render, with no console errors. Brief links
  `[text](url)` now render as real links.
- **Scoring quality (not a bug in the new code):** Basecamp scored 20, Low
  Fit. The keyword rules only read the synthesis summary and confirmed facts
  ("project management system"). They never read
  `company_facts.target_industries` ("software development").
- **Entity confusion:** Exa's growth-signal search for "Basecamp" also
  returned Basecamp Research (biotech) and Basecamp Fitness. The synthesis
  ignored them, but they still appear under Sources.

### 2026-11-10 · First tests against real n8n

| Case | Result | Time |
| --- | --- | --- |
| No key or wrong key | 403 ✅ | — |
| Invalid input / unknown job | 400 / 404 ✅ | — |
| `psycray-no-such-domain-8841.com` | `unreachable` ✅ (API + UI) | 4 s |
| `Qwxzv Plorptex Holdings` | `not_found` ✅ (API + UI) | 4 s |
| `basecamp.com` | `failed`: save step rejected `icp_breakdown` ❌ Bug 1 | 24 s |
| `Zapier` | `not_found` ❌ Bug 2 | 5 s |

- Fixed a setup issue: `N8N_WEBHOOK_BASE` ended in `/research`, which the
  proxy also adds. The first auth failure was a credential mismatch, fixed in n8n.
- **Bug 1, fixed:** the Postgres node rejects a bare array for a JSON
  column. `icp_breakdown` is now stored as `{ criteria: [...] }`, and the
  frontend reads that shape.
- **Bug 2, open:** the ranking code resolves "Zapier" → `zapier.com` when
  given normal Exa results (checked offline), so the live Exa node must be
  returning no results or a different shape. Needs the execution log.
- **Fixed while investigating:** the domain filter used `endsWith('x.com')`,
  which threw out legitimate sites like `dropbox.com` and `fedex.com`. It now
  only matches the exact domain or its subdomains.
- The error workflow works: the basecamp failure came back as `failed` with
  the name of the step that broke.
- The basecamp run got through every research step in about 24 s, faster
  than the 30–90 s estimate.

### 2026-11-09 · Phase 2.1a: live research flow

**Decisions**

- **No backend code.** A reverse proxy forwards `/api/*` to
  `<n8n>/webhook/psycray/*` and adds `X-Psycray-Key`: Vite in dev, nginx on
  the VPS. The secret stays out of the browser bundle (checked).
- **Asynchronous jobs** in a new `research_jobs` table. `POST` replies 202 with
  a `job_id`, and the app checks the status every 3 s. Jobs still running after
  10 min are reported as failed.
- **New workflow, original kept.** `n8n/workflows/*.json` are generated from
  the original export. Every node, prompt and credential reference is kept.
- **zod** validates responses. LLM-written fields are parsed leniently
  (bad values fall back to empty) so one odd field can't hide a whole result.

**n8n changes (v2)**

- Webhook entry with input validation, job creation, a 202 reply and
  duplicate-request detection (replaces the Form Trigger)
- New `not_found` outcome when no website is identified (before, the run
  stopped silently)
- 4xx/5xx websites now count as unreachable
- `refresh` option skips the 30-day cache
- Fixed `status` being saved with literal quote marks on the cached branch
- ICP scoring keeps the same points and also outputs a per-criterion
  `icp_breakdown`, with `unknown` when there is no evidence. Removed
  brief-cleanup code that never ran
- New **Psycray Research API** workflow: `GET /research/status` and an error
  handler that marks jobs as failed

**Frontend**

- `ResearchApi` is now `startResearch` + `getResearchJob`. The unused
  list and brief methods were removed and will come back with the history work
- New: `httpClient.ts`, `schemas.ts`, `useResearchJob`, `components/research/*`
- Company Research page: input, progress with elapsed time, a message for each
  outcome, then the result: profile, ICP scorecard, account brief and sources
- Submit is disabled while research runs, and the server also detects duplicates
- Added the shadcn `input` component and the `zod` dependency

**Verified**

- `tsc`, build and lint all pass
- Against a local fake n8n: 202/400/404 replies, path rewrite, secret header,
  the completed, unreachable, not found and failed views, refresh, and
  malformed LLM fields
- Mock mode still works
- **Not yet verified against real n8n**

### 2026-11-09 · Phase 2 kickoff: audit and integration design

> The proposal below has been partly superseded. The proxy is nginx/Vite
> rather than serverless functions, and the status route is
> `/research/status?id=`. The current contract is in [INTEGRATION.md](INTEGRATION.md).

**Frontend audit.** The Phase 1 code is kept as is.

| Area | Keep? | Notes |
| --- | --- | --- |
| Routes, layout, navigation | ✅ | No changes needed |
| shadcn/ui (`button`, `card`, `badge`, `separator`) | ✅ | Will add `input` |
| `types/research.ts` | ✅ | Will add job types and response schemas |
| `ResearchApi` interface | ✅, extend | Will add a method to check a running research job |
| `mockClient.ts` / mocks | ✅ | Stays as the offline and dev fallback |

**Workflow findings** (Nov 1 version)

- **Input:** an n8n **Form Trigger**. It answers the moment the form is
  submitted, so whoever submitted never receives the results. There is no
  webhook for the app to call.
- **Pipeline:** Normalize Input → (name: Exa search → Rank Website Candidates)
  → cache lookup → fetch website → company facts (gpt-4o-mini) → Exa growth
  signals → synthesis (gpt-4o) → ICP score → account brief (gpt-4o) → upsert
  into Neon.
- **Cached runs** end at *Return Cached Research*, which sends nothing back.
  Its status value is literally `"cached"` with the quote marks included.
- **Fresh runs** end at the upsert, which also sends nothing back.
- **Saved in `company_research`:** facts, signals, synthesis, sources, score,
  tier, brief. `scoring_rationale` is calculated but not saved.
- **Bugs found:**
  - *Check HTTP Error* uses `neverError`, so 404 and 403 pages are researched
    as if they were valid. Only connection errors reach the unreachable branch.
  - If Exa finds nothing for a company name, the run stops silently and never
    reports an error.
  - There is no way to skip the 30-day cache, so research can't be refreshed.
  - The brief cleanup in *ICP Scoring Logic* runs before the brief exists, so
    it never does anything.
- **Run time:** one website fetch, two Exa calls and three OpenAI calls
  (two on gpt-4o). Expected 30–90 s; to be measured. That is too long for a
  request that waits for the result, so runs should be asynchronous jobs.

**Decision (proposed):** a server proxy plus asynchronous jobs. See the
architecture below.

#### Proposed architecture

```text
React (browser)
   │  fetch /api/*            (no secrets in the browser)
   ▼
Server proxy (serverless functions)
   │  checks input, adds the X-Psycray-Key header
   ▼
n8n webhooks (header auth) ──► Neon Postgres
```

#### Proposed API contract (browser ↔ proxy)

| Method | Path | Returns |
| --- | --- | --- |
| `POST` | `/api/research` `{ input, refresh? }` | `202 { job_id }` |
| `GET` | `/api/research/jobs/:id` | `{ status, domain?, record?, error? }` |
| `GET` | `/api/companies` | Summary list (domain, name, tier, score, status, updated_at) |
| `GET` | `/api/companies/:domain` | Full record, including the account brief |

Job `status` is one of: `queued` · `running` · `completed` · `cached` ·
`unreachable` · `not_found` · `failed`.

#### Planned n8n changes

1. Add a **Webhook** trigger (POST, header auth) next to the form, feeding
   *Normalize Input*.
2. Create the job record, then reply `202 { job_id }` right away with
   **Respond to Webhook**.
3. Update the job status at every ending: cached, completed, unreachable,
   not found, and failed (through an error workflow).
4. Treat a non-2xx website response as unreachable.
5. Skip the cache when `refresh: true`.
6. Fix the quotes in the `"cached"` value, and save `scoring_rationale`.
7. Add a small read-only workflow behind `GET /companies` and
   `GET /companies/:domain`.

---

### 2026-11-01 · Phase 1: setup and architecture

- Set up React 19, TypeScript, Vite, Tailwind v4, shadcn/ui, React Router and Lucide
- Added routes: Overview, Company Research, Saved Companies, Account Briefs,
  Settings, plus a 404 page
- Defined domain types based on the workflow nodes and the `company_research` table
- Added the `ResearchApi` interface with a mock client and central mock data
- Replaced the shadcn CLI's third-party `cn` package with the standard
  `clsx` + `tailwind-merge` helper
