#!/bin/bash
# Deploys this repo to Psycray's VPS (https://jovial-demo.psycray.com).
#
#   deploy/deploy.sh            run from the repo root on your machine
#
# Needs the SSH key ~/.ssh/psycray_jovial loaded (ssh-add --apple-use-keychain).
# Steps: local tests + build → backup on the server → copy files (never
# .env.local, node_modules or dist) → npm ci + build on the server →
# rehearsal on a loopback-only port → restart → health checks.
# The running app keeps serving until the final restart (a few seconds).
set -euo pipefail

VPS=psy_jovial@192.3.199.172
KEY="$HOME/.ssh/psycray_jovial"
SRC=/opt/projects/jovial-demo/src
ENV_FILE=/home/psy_jovial/.config/jovial-demo/web.env
URL=https://jovial-demo.psycray.com
vps() { ssh -i "$KEY" -o BatchMode=yes -o IdentitiesOnly=yes "$VPS" "$@"; }
step() { printf '\n== %s\n' "$*"; }

cd "$(dirname "$0")/.."

step "Local checks"
npm test >/dev/null && echo "tests pass"
npm run build >/dev/null && echo "build ok"

step "Backup on the server"
vps "set -e; TS=\$(date -u +%Y%m%dT%H%M%SZ); B=\$HOME/backups/jovial-demo/\$TS; mkdir -p \$B
  rsync -a --exclude node_modules $SRC/ \$B/src/; cp -a $ENV_FILE \$B/web.env
  echo \$TS > \$HOME/backups/jovial-demo/LATEST; echo \"backup \$TS\""

step "Copy source"
LIST=$(mktemp)
git ls-files -co --exclude-standard \
  | grep -v -E '^(\.claude/|\.impeccable/|n8n/workflows/backups/)|^Psycray Research Agent\.json$' > "$LIST"
rsync -a --files-from="$LIST" -e "ssh -i $KEY -o BatchMode=yes -o IdentitiesOnly=yes" ./ "$VPS:$SRC/"
rsync -a -e "ssh -i $KEY -o BatchMode=yes -o IdentitiesOnly=yes" deploy/web-start.sh "$VPS:$SRC/.psycray/web-start.sh"
rm -f "$LIST"
echo "copied"

step "Install and build on the server"
vps "set -e; export NVM_DIR=\$HOME/.nvm; . \$NVM_DIR/nvm.sh; nvm use 24 >/dev/null; cd $SRC
  npm ci --no-audit --no-fund >/dev/null; npm run build >/dev/null; echo \"built with node \$(node -v)\""

step "Rehearsal on 127.0.0.1:41041 (not public)"
vps "export NVM_DIR=\$HOME/.nvm; . \$NVM_DIR/nvm.sh; nvm use 24 >/dev/null; cd $SRC
  HOST=127.0.0.1 PORT=41041 NODE_ENV=production node --env-file=$ENV_FILE server/server.mjs >/dev/null 2>&1 & PID=\$!
  sleep 1.5; ok=1
  for p in /healthz / /companies /api/icp/config; do
    c=\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:41041\$p); echo \"  \$p \$c\"; [ \"\$c\" = 200 ] || ok=0
  done
  kill -TERM \$PID; [ \$ok = 1 ]" || { echo "Rehearsal failed: the live app was NOT restarted." >&2; exit 1; }

step "Restart the live app"
vps "sudo -n jovial-demo-ctl restart >/dev/null; sleep 2; curl -sf http://127.0.0.1:41040/healthz && echo"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$URL/companies")
echo "public $URL/companies -> $code"
[ "$code" = 200 ] || { echo "Public check failed. Roll back with: deploy/rollback.sh" >&2; exit 1; }
echo "Deployed."
