#!/bin/bash
# Psycray production web app: /opt/projects/jovial-demo/src/.psycray/web-start.sh
#
# Started by systemd (jovial-demo-web.service) through
# /usr/local/libexec/jovial-demo-web-start, which loads Node 24 via NVM and
# sets HOST=127.0.0.1, PORT=41040, NODE_ENV=production. N8N_WEBHOOK_BASE and
# N8N_WEBHOOK_SECRET come from /home/psy_jovial/.config/jovial-demo/web.env
# (the unit's EnvironmentFile). Logs go to the journal: sudo jovial-demo-ctl logs
set -euo pipefail
cd /opt/projects/jovial-demo/src

if [ ! -f dist/index.html ]; then
  echo "dist/index.html is missing: run 'npm ci && npm run build' in $(pwd)" >&2
  exit 78
fi

# exec: node becomes the service's main process and receives SIGTERM directly
exec node server/server.mjs
