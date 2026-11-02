# Psycray Intelligence

A B2B sales intelligence dashboard for **Psycray Corp**, the frontend for the
**Psycray Research Agent** n8n workflow.

The workflow researches a company from its name or domain. It extracts verified
facts from the company's website, gathers growth signals with Exa, synthesizes
evidence with OpenAI, calculates an ICP score, writes an account brief, and
caches the result in Neon PostgreSQL. This app is the interface to all of that.

> **Status: Phase 1, project setup and architecture.**
> Every route renders a placeholder. Data comes from local mocks, and no
> backend is connected yet.

---

## Quick start

Requires **Node.js 20.19+** (developed on Node 24).

```bash
npm install      # install dependencies
npm run dev      # start the dev server → http://localhost:5173
```

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

There is no state library, data-fetching library or form library yet. We will
add them only when a feature needs one.

---

## Project structure

```text
src/
├── app/
│   └── router.tsx            # Route table (createBrowserRouter)
├── components/
│   ├── layout/               # App shell: Sidebar, MobileNav, PageHeader, …
│   └── ui/                   # shadcn/ui components (generated, editable)
├── config/
│   └── navigation.ts         # Sidebar links: one source of truth
├── lib/
│   └── utils.ts              # cn() class-name helper
├── mocks/
│   └── companies.ts          # Centralized mock research records
├── pages/                    # One component per route
├── services/
│   └── api/
│       ├── types.ts          # ResearchApi interface (the contract)
│       ├── mockClient.ts     # Mock implementation backed by src/mocks
│       └── index.ts          # Exports the active `api` instance
├── types/
│   └── research.ts           # Domain types mirroring the n8n workflow
├── index.css                 # Tailwind entry + shadcn theme tokens
└── main.tsx                  # App entry point
```

Imports use the `@/` alias for `src/`, e.g. `import { api } from "@/services/api"`.

---

## Routes

| Path         | Page             | Purpose (future phases)                             |
| ------------ | ---------------- | --------------------------------------------------- |
| `/`          | Overview         | Pipeline health across researched accounts          |
| `/research`  | Company Research | Run the research agent on a name or domain          |
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
pages ──► services/api (ResearchApi) ──► mockClient ──► mocks/companies.ts
                                    └──► httpClient  ──► n8n / Postgres   (future)
```

Pages depend only on the `ResearchApi` interface. To connect the real backend,
write a client that implements the interface and select it in
`src/services/api/index.ts`. No page code needs to change.

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
| `IcpScore`, `IcpTier`    | ICP Scoring Logic                                  |
| `AccountBrief`           | Generate Account Brief (gpt-4o)                    |
| `CompanyResearchRecord`  | `company_research` table (Neon Postgres)           |
| `ResearchRunResult`      | Cached, unreachable and completed responses        |

### ICP scoring (reference)

The workflow starts each company at **20** and adds points, capped at 100:

| Signal                                           | Points |
| ------------------------------------------------ | ------ |
| SaaS / software / technology vertical            | +35    |
| Manufacturing / industrial / logistics (else-if) | +30    |
| Workflow, automation, portal or integration need | +25    |
| Growth: hiring, funding, partnership, expansion  | +20    |

**High Fit** ≥ 80 · **Moderate Fit** ≥ 55 · **Low Fit** < 55 ·
**Needs Review** when the synthesis is not valid JSON.

### Caching

The workflow reuses a `validated` record if it is less than **30 days** old.
Domains it cannot reach are stored with status `error/unreachable`.

---

## Mock data

`src/mocks/companies.ts` holds three **fictional** companies on `.example`
domains. Together they cover a High Fit account, a Moderate Fit account and an
unreachable domain. The mock client adds ~300 ms of latency so loading states
show up during development.

---

## Roadmap

- [x] **Phase 1:** Setup, routing, types, mock API, placeholders
- [ ] Company Research page wired to the mock API
- [ ] Saved Companies table and Account Brief viewer
- [ ] Live backend integration (n8n webhook + Postgres read API)
