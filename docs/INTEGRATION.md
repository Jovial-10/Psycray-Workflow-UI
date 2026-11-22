# n8n Integration

How the React app talks to the Psycray Research Agent, and how to set it up.

**Contents:** [Architecture](#architecture) · [API contract](#api-contract) ·
[n8n setup](#n8n-setup) · [Local development](#local-development) ·
[Production (VPS)](#production-vps)

---

## Architecture

```text
Browser (React)
   │  fetch /api/*                      no secrets, same origin
   ▼
Reverse proxy                           Vite (dev) · nginx (VPS)
   │  /api/X → <n8n>/webhook/psycray/X
   │  + header  X-Psycray-Key: <secret>
   ▼
n8n webhooks (Header Auth)
   │
   ├─ Psycray Research Agent v2         POST  /research          → starts a job
   └─ Psycray Research API              GET   /research/status   → job + result
                                        GET   /companies         → saved research (history)
                                        GET   /research/jobs     → recent requests (activity)
                                        POST  /research/rescore  → re-score saved evidence
                                        GET   /icp/config        → published ICP versions
                                        POST  /icp/config        → publish a version
                                        POST  /icp/rescore       → rescore saved companies
                                        GET   /icp/history       → a company's score history
                                        POST  /icp/interpret     → ICP assistant proposal (no save)
                                        POST  /icp/archive       → archive / restore a version
                                        Error Trigger            → marks job failed
   ▼
Neon Postgres                           company_research · research_jobs
```

- **No backend code.** The proxy is the only server-side piece. It keeps the
  secret and exposes only `/webhook/psycray/*`.
- **Asynchronous jobs.** Fresh research takes 30–90 s. `POST` replies right
  away with a `job_id`, and the app checks `/status` every 3 s.
- **n8n stays in charge.** All research, scoring and saving still happens in
  the workflow.

### Job lifecycle

```text
POST /research ──► running ──┬──► cached        valid research < 30 days old (skipped when refresh=true)
                             ├──► completed     fresh research saved
                             ├──► unreachable   website down or returned 4xx/5xx
                             ├──► not_found     no website found for the name
                             └──► failed        a step errored · or still running after 10 min
```

---

## API contract

All routes are relative to `/api` (browser) or `<n8n>/webhook/psycray` (proxy target).

### `POST /research`

```jsonc
// request
{ "input": "acme.com", "refresh": false }

// 202 Accepted
{ "job_id": "3f1c…", "duplicate": false }

// 400 Bad Request: input missing, or shorter than 2 or longer than 200 characters
{ "error": "Enter a company name or website domain (2-200 characters)." }
```

If an identical request is already running (started under 10 min ago),
the response returns that job's id with `duplicate: true` and starts no
second run.

### `GET /research/status?id=<job_id>`

```jsonc
// 200 OK
{
  "job_id": "3f1c…",
  "status": "running | completed | cached | unreachable | not_found | failed",
  "input": "acme.com",
  "domain": "acme.com",          // null until resolved
  "error": null,                 // user-facing message for unsuccessful outcomes
  "created_at": "…", "updated_at": "…",
  "record": { /* company_research row */ }   // only for completed / cached
}

// 404 Not Found
{ "error": "Research job not found." }
```

### `GET /companies`

```jsonc
// 200 OK: up to 200 company_research rows, newest first
{ "records": [ { "domain": "zapier.com", "status": "validated", "icp_score": 100, … } ] }
```

Rows include unreachable domains (`status: "error/unreachable"`). Overview
and Saved Companies read this list, so opening a company never re-runs research.

### `GET /research/jobs`

```jsonc
// 200 OK: up to 50 research_jobs rows, newest first
{ "jobs": [ { "job_id": "…", "status": "cached", "input": "Zapier", "domain": "zapier.com", "error": null, "created_at": "…" } ] }
```

Jobs stuck in `running` for over 10 minutes are reported as `failed`, the same
as `/research/status`.

### `POST /research/rescore`

```jsonc
// Request
{ "domain": "basecamp.com" }
// 200 OK: the saved row with the new score. No research, no LLM calls.
{ "record": { "domain": "basecamp.com", "icp_score": 78, "icp_breakdown": { "criteria": [ … ], "change": { … } }, … } }
// 404 no validated research · 409 research predates evidence-based scoring (refresh once)
```

Re-scores the evidence saved with the research (`synthesized_research.icp_evidence`)
using the same engine as fresh research, appends a row to `icp_score_history`
and updates the score in `company_research`. `updated_at` (the research date)
does not change.

### Scoring record (`company_research.icp_breakdown`)

`{ criteria, score, tier, coverage, max_possible, missing, weights,
algorithm_version, config_version, snapshot_id, evidence_fingerprint,
calculated_at, previous, change }`. `change.reasons` is built by the engine from
the differences between the two scores (criterion points, statuses, evidence
items, versions), never written by the LLM. Every score is also appended to
`icp_score_history` ([002](../n8n/sql/002_icp_score_history.sql)).

### ICP configuration (`Psycray ICP API` workflow)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/icp/config` | app key | `{ profile, versions[] }`, newest first; `profile.active_version_id` is applied everywhere |
| `POST` | `/icp/config` | app key | `{ config, base_version_id, note, published_by? }` → 201 `{ version }`; 400 invalid (`details[]`), 409 stale base |
| `POST` | `/icp/rescore` | app key | Rescore every saved company with the active version → `{ rescored, unchanged, up_to_date, needs_refresh[], changes[] }` |
| `GET` | `/icp/history?domain=` | app key | Score history entries, newest first |
| `POST` | `/icp/interpret` | app key | `{ instruction, config }` → `{ proposal }` (never saves). 400 bad instruction, 429 rate limited (10/min, 150/day), 502 model failed or returned invalid output |
| `POST` | `/icp/archive` | app key | `{ version_id, archived }` → hide or restore a version. 400 for version 1 or the active version, 404 unknown |

**No logins or admin keys** (decided 2026-11-22; migration 004 removed the
`icp_admins` table). Anyone who can reach the app can publish and recalculate;
`published_by` is optional attribution typed in the publish dialog. The server
still validates every config (`validateConfig`), assigns the version label
(client-supplied labels are ignored) and refuses stale publishes (409).
Published versions are immutable (DB trigger). Access is controlled at the
server instead: see [Production](#production-vps).

The frontend checks every response with zod (`src/services/api/schemas.ts`).
Fields the LLM wrote are parsed leniently: a malformed value falls back to
empty instead of failing the whole result. The list endpoints validate row by
row, so one malformed older row is skipped (with a console warning) instead of
breaking the page.

---

## n8n setup

One-time setup on the Elestio n8n instance. The original **Psycray Research
Agent** workflow is not modified. v2 is imported as a separate workflow.

| # | Step | Where |
| - | ---- | ----- |
| 1 | Run [`n8n/sql/001_research_jobs.sql`](../n8n/sql/001_research_jobs.sql) [`002`](../n8n/sql/002_icp_score_history.sql), [`003`](../n8n/sql/003_icp_profiles.sql), [`004`](../n8n/sql/004_remove_admin_keys.sql) and [`005`](../n8n/sql/005_icp_archive_and_assistant.sql) | Neon SQL editor |
| 2 | Create a **Header Auth** credential: name `X-Psycray-Key`, value a long random secret (e.g. `openssl rand -hex 32`) | n8n → Credentials |
| 3 | Import [`psycray-research-api.json`](../n8n/workflows/psycray-research-api.json) | n8n → Import from File |
| 4 | Import [`psycray-research-agent-v2.json`](../n8n/workflows/psycray-research-agent-v2.json) | n8n → Import from File |
| 5 | In both workflows, open each **Webhook** node and choose the Header Auth credential. Check that Postgres, OpenAI and Exa credentials are set | Node settings |
| 6 | Agent v2 → **Settings → Error workflow** → *Psycray Research API* | Workflow settings |
| 7 | **Activate** the API workflow, then Agent v2 | Toggle, top right |

> If the original workflow is ever activated, it uses a form trigger, so it
> won't conflict with the v2 webhook paths.

### What changed in v2

| Area | Change |
| ---- | ------ |
| Entry | The Form Trigger is replaced by **Research Request** (POST webhook). It validates the input, creates a job, replies 202, and skips duplicate requests |
| Name lookup | Search results with no usable website now end the job as `not_found` instead of stopping silently |
| Cache | `refresh: true` skips the 30-day cache |
| Website check | 4xx/5xx responses go to the unreachable branch (before, only connection errors did) |
| Cached branch | Fixed `status` being saved as the string `"cached"` with literal quote marks |
| ICP scoring | Same points and tiers as before. Now also produces `icp_breakdown` (per-criterion score/max/status/reason). Criteria are marked `unknown` when there is no evidence. Removed brief-cleanup code that never ran |
| Persistence | `icp_breakdown` saved to `company_research`. Every ending updates `research_jobs` |

The workflow files were generated from the original export, so every
existing node, prompt and credential reference is kept.

---

## Local development

```bash
cp .env.example .env.local
# set N8N_WEBHOOK_BASE=https://<n8n-host>/webhook/psycray
# set N8N_WEBHOOK_SECRET=<header auth value>
npm run dev
```

`N8N_*` variables are read only by the Vite dev server. They are never
bundled into browser code (checked: the built `dist/` contains neither).

Set `VITE_API_MODE=mock` to work without n8n.

---

## Production (VPS)

Build with `npm run build` and serve `dist/` with nginx. The `/api` rule
does the same job as the Vite proxy:

```nginx
server {
    # … listen / server_name / TLS …

    root /var/www/psycray-intelligence/dist;

    location /api/ {
        limit_except GET POST { deny all; }
        proxy_pass https://<n8n-host>/webhook/psycray/;
        proxy_set_header Host <n8n-host>;
        proxy_set_header X-Psycray-Key "<secret>";
        proxy_ssl_server_name on;
        proxy_read_timeout 30s;
    }

    # Client-side routing
    location / {
        try_files $uri /index.html;
    }
}
```

> **Access control happens here, not in the app.** The app has no logins
> (your decision, 2026-11-22), so anyone who can reach the URL can run
> research (spending Exa/OpenAI credits) and publish ICP versions. Restrict the
> site at nginx: an IP allowlist for the office/VPN (`allow <office-ip>;
> deny all;` in the `location /` and `location /api/` blocks), or HTTP basic
> auth, or keep the VPS on a private network/VPN. The `X-Psycray-Key` header
> stays: it stops anyone calling the n8n webhooks directly.
