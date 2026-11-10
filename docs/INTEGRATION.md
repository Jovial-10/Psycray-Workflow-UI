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

The frontend checks every response with zod (`src/services/api/schemas.ts`).
Fields the LLM wrote are parsed leniently: a malformed value falls back to
empty instead of failing the whole result.

---

## n8n setup

One-time setup on the Elestio n8n instance. The original **Psycray Research
Agent** workflow is not modified. v2 is imported as a separate workflow.

| # | Step | Where |
| - | ---- | ----- |
| 1 | Run [`n8n/sql/001_research_jobs.sql`](../n8n/sql/001_research_jobs.sql) | Neon SQL editor |
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

> Access control (Phase 2.1 requirement) is still to do. Until it's in place,
> anyone who can reach the URL can start research.
