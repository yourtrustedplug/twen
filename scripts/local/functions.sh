#!/usr/bin/env bash
# Serve local edge functions with the local-only test flag.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if ! supabase status >/dev/null 2>&1; then
  echo "Local Supabase is not running. Start it with: npm run local:start" >&2
  exit 1
fi

exec supabase functions serve --env-file supabase/functions/.env.local
