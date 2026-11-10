# Development Log

Major changes and decisions, plus what comes next. Newest entries first.

**Contents:** [Current status](#current-status) · [Next steps](#next-steps) ·
[Open questions](#open-questions) · [Log](#log)

---

## Current status

| | |
| --- | --- |
| **Phase** | 2.1: frontend and research dashboard |
| **State** | Live research flow built and tested against a fake n8n. **Not yet tested against real n8n** |
| **Blocked on** | n8n setup (import workflows, run SQL), then `.env.local` for the end-to-end test |
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
- [ ] **You:** n8n setup steps 1–7 in [INTEGRATION.md](INTEGRATION.md#n8n-setup)
- [ ] **You:** fill in `.env.local` (`N8N_WEBHOOK_BASE`, `N8N_WEBHOOK_SECRET`)
- [ ] **Verify end to end on real n8n:** valid domain · company name · cached company · unreachable · invalid name
- [ ] Measure real run times and adjust the "taking longer than usual" threshold (90 s)

### Phase 2.1b: rest of the dashboard

- [ ] Research history: `GET /companies` and `GET /companies/:domain` (n8n API workflow), Saved Companies page
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
| 5 | Can I get a test webhook secret in `.env.local` to run the end-to-end tests? | Open |

---

## Log

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
