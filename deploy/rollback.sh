#!/bin/bash
# Restores a backup made by deploy/deploy.sh (or the first manual one).
#
#   deploy/rollback.sh                 list backups
#   deploy/rollback.sh <TIMESTAMP>     restore that backup and restart
#
# Restores src (code, dist, .psycray/web-start.sh) and web.env, reinstalls
# dependencies, then restarts. Research data lives in Neon and is unaffected.
set -euo pipefail

VPS=psy_jovial@192.3.199.172
KEY="$HOME/.ssh/psycray_jovial"
SRC=/opt/projects/jovial-demo/src
ENV_FILE=/home/psy_jovial/.config/jovial-demo/web.env
vps() { ssh -i "$KEY" -o BatchMode=yes -o IdentitiesOnly=yes "$VPS" "$@"; }

if [ $# -eq 0 ]; then
  echo "Backups on the server (newest last):"
  vps 'ls -1 $HOME/backups/jovial-demo | grep -E "^[0-9]{8}T"'
  exit 0
fi
TS=$1
vps "set -e; B=\$HOME/backups/jovial-demo/$TS; [ -d \$B/src ] || { echo \"No backup $TS\" >&2; exit 1; }
  rsync -a --exclude node_modules \$B/src/ $SRC/
  cp -a \$B/web.env $ENV_FILE
  if [ -f $SRC/package-lock.json ]; then
    export NVM_DIR=\$HOME/.nvm; . \$NVM_DIR/nvm.sh; nvm use 24 >/dev/null; cd $SRC; npm ci --no-audit --no-fund >/dev/null
  fi
  sudo -n jovial-demo-ctl restart >/dev/null; sleep 2; sudo -n jovial-demo-ctl status | grep -E 'Active:|CGroup' -A1 | head -4"
echo "Restored $TS. Check: https://jovial-demo.psycray.com"
