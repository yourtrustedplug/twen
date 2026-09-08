#!/usr/bin/env bash
# Watch .env for changes and re-run remote checks immediately when keys are updated.
# Usage: ./scripts/watch-env.sh
set -euo pipefail
cd "$(dirname "$0")/.."

last=""
echo "Watching .env for API key refresh (Ctrl+C to stop)…"
while true; do
  if [ -f .env ]; then
    cur=$(stat -f "%m" .env 2>/dev/null || stat -c "%Y" .env)
    if [ "$cur" != "$last" ]; then
      last=$cur
      echo ""
      echo "=== .env changed $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
      if ./scripts/check-remote.sh; then
        echo "AGENT_LOOP_TICK_prodready {\"prompt\":\"Keys appear valid. Paste LAUNCH.sql if needed, deploy functions, re-run smoke, update canvas.\"}"
      else
        echo "Still failing remote checks — update publishable/secret for utzkityhzxpzipvmdmxz"
      fi
    fi
  fi
  sleep 15
done
