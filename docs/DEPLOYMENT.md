# Deployment (Psycray VPS)

Live at **https://jovial-demo.psycray.com** since 2026-11-23.

## Architecture

```
Browser ──HTTPS──▶ Cloudflare ──▶ Psycray's proxy on the VPS ──▶ 127.0.0.1:41040
                                                                  node server/server.mjs
                                                                  ├─ /            built React app (dist/), SPA fallback
                                                                  ├─ /api/*  ────▶ n8n webhooks (+ X-Psycray-Key, server-side)
                                                                  └─ /healthz
```

- One Node process, no dependencies beyond Node 24 (`server/server.mjs`). It serves `dist/`
  and forwards `/api/*` to `N8N_WEBHOOK_BASE`, adding the secret header. Browsers never see
  the secret; a client-sent `X-Psycray-Key` or cookie is dropped.
- The app never talks to Neon directly; n8n does. No database credentials on the VPS.
- Port 41040 is bound to localhost only and is not reachable from the internet (checked).
- HTTPS, the domain and the proxy are Psycray's (Cloudflare in front); nothing there was changed.

## Server layout

| What | Where |
| --- | --- |
| Source, build, `node_modules` | `/opt/projects/jovial-demo/src` |
| Start script (ours) | `src/.psycray/web-start.sh` (copy in repo: `deploy/web-start.sh`) |
| Service | systemd `jovial-demo-web.service` → `/usr/local/libexec/jovial-demo-web-start` (loads NVM Node 24, sets `HOST=127.0.0.1`, `PORT=41040`, `NODE_ENV=production`) → `web-start.sh` → `exec node server/server.mjs` |
| Environment | `/home/psy_jovial/.config/jovial-demo/web.env` (owner-only; loaded by the unit's `EnvironmentFile`) |
| Backups | `/home/psy_jovial/backups/jovial-demo/<UTC timestamp>/` (src without node_modules + web.env) |
| SSH | `psy_jovial@192.3.199.172`, key `~/.ssh/psycray_jovial` (passphrase in the macOS keychain) |

### Environment variables (`web.env`)

| Name | Purpose |
| --- | --- |
| `N8N_WEBHOOK_BASE` | n8n webhook base, e.g. `https://<n8n-host>/webhook/psycray` |
| `N8N_WEBHOOK_SECRET` | Value of n8n's *X-Psycray-Key* header credential |

`HOST`, `PORT` and `NODE_ENV` come from the service wrapper. To view names without values:
`sed -E 's/=.*/=<set>/' ~/.config/jovial-demo/web.env`. Never `cat` it into logs or chat.

## Everyday commands (on the VPS)

```sh
sudo jovial-demo-ctl status      # running? which process?
sudo jovial-demo-ctl logs        # journal: one line per request, startup errors
sudo jovial-demo-ctl restart     # restart (graceful: in-flight requests finish)
sudo jovial-demo-ctl deactivate  # stop and disable
sudo jovial-demo-ctl activate    # enable and start (fails loudly if the app doesn't stay up)
curl -s http://127.0.0.1:41040/healthz   # {"ok":true}
```

## Deploy a new version (from your machine)

```sh
ssh-add --apple-use-keychain ~/.ssh/psycray_jovial   # once per login, if needed
deploy/deploy.sh
```

Local tests and build → server backup → copy files (never `.env.local`, `node_modules` or `dist`)
→ `npm ci` + `npm run build` on the server → rehearsal on loopback port 41041 → restart →
health and public checks. The live app keeps serving until the final restart (about 2 s). If
the rehearsal fails, the live app is not touched.

Frontend-only and server changes deploy the same way. n8n workflow changes are separate
(`node scripts/deploy-n8n.ts …`, see INTEGRATION.md).

## Roll back

```sh
deploy/rollback.sh               # list backups
deploy/rollback.sh 20261123T002948Z
```

Restores code, build and `web.env`, reinstalls dependencies, restarts. Research data and ICP
versions live in Neon and are not affected. `20261123T002516Z` is the original smoke-test
placeholder.

## Diagnosing problems

| Symptom | Check |
| --- | --- |
| Public URL down | `sudo jovial-demo-ctl status`; `curl 127.0.0.1:41040/healthz` on the VPS. If local works and public doesn't, it's the proxy/Cloudflare: ask the Psycray admin |
| Service won't start | `sudo jovial-demo-ctl logs`: `N8N_WEBHOOK_… is not set` → `web.env`; `dist/index.html is missing` → `npm ci && npm run build` |
| Pages load, data doesn't | Logs show `upstream unreachable` / `timeout` → n8n is down or slow (`curl https://<n8n-host>/healthz`); a 403 from n8n → `N8N_WEBHOOK_SECRET` doesn't match the n8n credential |
| A research job fails | The job's error in the UI; n8n's Executions list for *Psycray Research Agent v2* |

## Verified on 2026-11-23

All routes, including direct refresh of `/companies/<domain>`; light and dark; saved companies,
company pages and score history; cached research (4 s); server-side validation (400/404/405);
ICP Studio with live versions; restart recovery; no secrets in the built files; port 41040
closed to the internet. No new paid research was run.

## Known issues and risks

- **No access control.** By decision there are no logins (see DEVLOG). The site is public:
  anyone with the URL can run research (spending Exa/OpenAI credits), publish ICP versions and
  recalculate scores. Recommended: Cloudflare Access in front of the site (Psycray admin).
- **Weak webhook secret.** `N8N_WEBHOOK_SECRET` is a short phrase with spaces, not a random
  value. Rotate it: generate one (`openssl rand -hex 32`, use the output), set it in the n8n
  *X-Psycray-Key* credential, `web.env` and `.env.local`, then `sudo jovial-demo-ctl restart`.
- The Account Briefs page is still a placeholder; briefs open from each company's page.
- `deploy.sh` never deletes files on the server; files removed from the repo stay there harmlessly.
