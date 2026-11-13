# Psycray Intelligence

A B2B sales intelligence dashboard for **Psycray Corp**, the frontend for the
**Psycray Research Agent** n8n workflow.

The workflow researches a company from its name or domain. It extracts verified
facts from the company's website, gathers growth signals with Exa, synthesizes
evidence with OpenAI, calculates an ICP score, writes an account brief, and
caches the result in Neon PostgreSQL. This app is the interface to all of that.

> **Status: Phase 2.1, live research flow + design system and app shell.**
> **Company Research** starts real n8n research and shows the results. The
> other routes are still placeholders. See [docs/DEVLOG.md](docs/DEVLOG.md)
> for progress and next steps.

---

## Quick start

Requires **Node.js 20.19+** (developed on Node 24).

```bash
npm install
cp .env.example .env.local   # then fill in the n8n values (see below)
npm run dev                  # → http://localhost:5173
```

| Mode | `.env.local` | Needs n8n? |
| ---- | ------------ | ---------- |
| **Live** | `N8N_WEBHOOK_BASE` + `N8N_WEBHOOK_SECRET` | Yes. See [docs/INTEGRATION.md](docs/INTEGRATION.md#n8n-setup) |
| **Mock** | `VITE_API_MODE=mock` | No. Uses fictional data from `src/mocks/` |

In mock mode, try `brightline-fabrication.example` or `LedgerLoop` (cached
result), `unreachable.example` (unreachable) or any other name (not found).
Add `VITE_MOCK_SCENARIO=empty` to preview the empty states.

**Overview always uses sample data for now.** There is no n8n endpoint for
research history yet, so even in live mode Overview shows the fictional set,
with a "Sample data" notice.

| Command           | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start the Vite dev server with hot reload        |
| `npm run build`   | Type-check (`tsc -b`) and build to `dist/`       |
| `npm run preview` | Serve the production build locally               |
| `npm run lint`    | Lint with oxlint                                 |

---

## Stack

| Concern    | Choice                                       |
| ---------- | -------------------------------------------- |
| Framework  | React 19 + TypeScript (strict)               |
| Build      | Vite                                         |
| Styling    | Tailwind CSS v4 (via `@tailwindcss/vite`)    |
| Components | shadcn/ui (Radix primitives, copied into repo) |
| Routing    | React Router (data router)                   |
| Icons      | Lucide React                                 |
| Type       | Geist + Geist Mono (self-hosted via fontsource) |
| Validation | zod (API responses)                          |

There is no state library, data-fetching library or form library yet. We will
add them only when a feature needs one.

> **shadcn note:** `npx shadcn add <component>` currently writes
> `import { cn } from "cn"` and installs a third-party `cn` package. Change the
> import to `@/lib/utils` and run `npm uninstall cn`.

---

## Project structure

```text
src/
├── app/
│   └── router.tsx            # Route table (createBrowserRouter)
├── components/
│   ├── common/               # Shared app components (EmptyState)
│   ├── layout/               # App shell: AppLayout, AppSidebar, AppHeader
│   ├── overview/             # Research bar, metric cards, companies table, activity log
│   ├── research/             # Research form, status, results, FitBadge, skeleton
│   ├── theme/                # ThemeProvider, ThemeToggle
│   └── ui/                   # shadcn/ui components (generated, editable)
├── config/
│   └── navigation.ts         # Sidebar links: one source of truth
├── hooks/
│   ├── useOverviewData.ts    # Companies + research-job log for Overview
│   ├── useResearchJob.ts     # Start a job, poll until it finishes
│   ├── useTheme.ts           # Read / set the theme preference
│   └── use-mobile.ts         # Below-md breakpoint (sidebar drawer)
├── lib/
│   ├── overview.ts           # Overview metrics, table rows, activity (derived, never hardcoded)
│   ├── theme.ts              # Theme types, storage key, context
│   └── utils.ts              # cn() class-name helper
├── mocks/
│   ├── companies.ts          # 14 fictional research records (scores mirror n8n scoring)
│   ├── researchJobs.ts       # Fictional research-job log (mirrors research_jobs)
│   └── time.ts               # Dates relative to today
├── pages/                    # One component per route
├── services/
│   └── api/
│       ├── types.ts          # ResearchApi interface (the contract)
│       ├── httpClient.ts     # Live client → /api → n8n
│       ├── mockClient.ts     # Mock client backed by src/mocks
│       ├── schemas.ts        # zod validation of n8n responses
│       └── index.ts          # Picks the client from VITE_API_MODE
├── types/
│   └── research.ts           # Domain types mirroring the n8n workflow
├── index.css                 # Tailwind entry + shadcn theme tokens
└── main.tsx                  # App entry point
```

Outside `src/`:

```text
n8n/
├── workflows/                # Importable n8n workflows (v2 agent + API)
└── sql/                      # Neon migrations
docs/
├── DEVLOG.md                 # Changes, decisions, next steps
└── INTEGRATION.md            # API contract, n8n setup, deployment
PRODUCT.md                    # Product facts the design system builds on
DESIGN.md                     # Design system: tokens, components, rules
```

### Design system

All colors live as tokens in `src/index.css`, with light and dark versions:
zinc neutrals, deep indigo for primary actions only, and emerald / amber / red
for High / Moderate / Low Fit. Use the token classes (`bg-card`,
`text-muted-foreground`, `bg-success-soft`, …), never raw palette colors.
Cards use a 1px border and no shadow. The theme follows the OS until someone
picks one with the header toggle or in Settings. Full rules are in
[DESIGN.md](DESIGN.md).

Imports use the `@/` alias for `src/`, e.g. `import { api } from "@/services/api"`.

---

## Routes

| Path         | Page             | Purpose (future phases)                             |
| ------------ | ---------------- | --------------------------------------------------- |
| `/`          | Overview         | **Built:** research bar, metrics, recent companies, activity (sample data) |
| `/research`  | Company Research | **Live:** research a name or domain, view results   |
| `/companies` | Saved Companies  | Browse every company in the research cache          |
| `/briefs`    | Account Briefs   | Read sales-ready briefs for validated accounts      |
| `/settings`  | Settings         | Backend connection and scoring reference            |
| `*`          | Not Found        | Fallback for unknown URLs                           |

**To add a route:** create a page in `src/pages/`, register it in
`src/app/router.tsx`, and add a link in `src/config/navigation.ts`.

---

## Architecture

### Data flow

```text
pages ──► hooks ──► services/api (ResearchApi) ─┬─► httpClient ──► /api ──► proxy ──► n8n ──► Neon
                                                └─► mockClient ──► mocks/companies.ts
```

Pages depend only on the `ResearchApi` interface. Research runs as an
**asynchronous job**: `POST /api/research` returns a `job_id`, and the app
checks `/api/research/status` until the job finishes. The proxy (Vite in dev,
nginx in production) adds the n8n secret, so it never reaches the browser.
Full details are in [docs/INTEGRATION.md](docs/INTEGRATION.md).

### Domain types

`src/types/research.ts` follows the workflow node by node. Field names stay in
**snake_case** to match the `company_research` table, so we don't need a
mapping layer.

| Type                     | Source in the n8n workflow                         |
| ------------------------ | -------------------------------------------------- |
| `NormalizedInput`        | Normalize Input                                    |
| `CompanyFacts`           | Extract Core Company Facts (gpt-4o-mini)           |
| `ExaSignal`, `ResearchSignals` | Find Growth Signals (Exa)                    |
| `SynthesizedResearch`    | Synthesize Intelligence & Evidence (gpt-4o)        |
| `IcpCriterionScore`, `IcpTier` | ICP Scoring Logic (`icp_breakdown`)          |
| `AccountBrief`           | Generate Account Brief (gpt-4o)                    |
| `CompanyResearchRecord`  | `company_research` table (Neon Postgres)           |
| `ResearchJob`, `ResearchJobStatus` | `research_jobs` table / status endpoint  |

### ICP scoring (reference)

The workflow starts each company at **20** and adds points, capped at 100:

| Signal                                           | Points |
| ------------------------------------------------ | ------ |
| SaaS / software / technology vertical            | +35    |
| Manufacturing / industrial / logistics (else-if) | +30    |
| Workflow, automation, portal or integration need | +25    |
| Growth: hiring, funding, partnership, expansion  | +20    |

**High Fit** ≥ 80 · **Moderate Fit** ≥ 55 · **Low Fit** < 55 ·
**Needs Review** when the synthesis is not valid JSON. Each criterion is
returned with its score, maximum and status (`met`, `not_met` or `unknown`),
so the UI can explain the score.

### Caching

The workflow reuses a `validated` record if it is less than **30 days** old.
Domains it cannot reach are stored with status `error/unreachable`.

---

## Mock data

`src/mocks/companies.ts` holds three **fictional** companies on `.example`
domains. Together they cover a High Fit account, a Moderate Fit account and an
unreachable domain. The mock client simulates a job that runs for 4 s,
so loading states show up during development.

---

## Roadmap

- [x] **Phase 1:** Setup, routing, types, mock API, placeholders
- [x] **Phase 2.1a:** Live research flow (jobs, status, results view)
- [x] **Phase 2 shell:** Design system, collapsible sidebar, mobile drawer, light/dark theme
- [x] **Phase 3:** Overview dashboard (sample data)
- [ ] **Phase 2.1b:** Research history, saved briefs, access control, VPS deploy
- [ ] **Phase 2.2:** Configurable ICP
- [ ] **Phase 2.3:** Historical sales analysis (optional)
