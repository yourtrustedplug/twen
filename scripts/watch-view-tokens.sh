#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Watching .env for TIKTOK_ACCESS_TOKEN / INSTAGRAM_ACCESS_TOKEN…"
last=""
while true; do
  cur=$(stat -f "%m" .env 2>/dev/null || echo 0)
  if [ "$cur" != "$last" ]; then
    last=$cur
    set -a; # shellcheck disable=SC1091
    . ./.env
    set +a
    changed=0
    if [ -n "${TIKTOK_ACCESS_TOKEN:-}" ] || [ -n "${TIKTOK_REFRESH_TOKEN:-}" ] || [ -n "${INSTAGRAM_ACCESS_TOKEN:-}" ]; then
      echo "$(date -u +%H:%M:%SZ) view tokens detected — pushing secrets"
      ./scripts/push-secrets.sh || true
      ./scripts/check-remote.sh || true
      changed=1
    fi
    [ "$changed" = 1 ] && echo "AGENT_LOOP_TICK_prodready {\"prompt\":\"View tokens updated; recheck remote and canvas.\"}"
  fi
  sleep 20
done
