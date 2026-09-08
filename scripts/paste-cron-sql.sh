#!/usr/bin/env bash
# Fill CRON_VERIFY_VIEWS.sql with CRON_SECRET from .env and copy to clipboard.
# Does not print the secret. Paste into Supabase SQL Editor after OAUTH_TABLES.sql.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
set -a; source .env; set +a

if [ -z "${CRON_SECRET:-}" ]; then
  echo "CRON_SECRET missing in .env" >&2
  exit 1
fi

# Escape single quotes for SQL string literal inside JSON header
esc=$(printf '%s' "$CRON_SECRET" | sed "s/'/''/g")
sed "s/REPLACE_ME_CRON_SECRET/${esc}/g" supabase/CRON_VERIFY_VIEWS.sql | pbcopy
echo "Clipboard: CRON_VERIFY_VIEWS.sql with CRON_SECRET filled (not printed)."
echo "Paste in Supabase SQL Editor → Run. Then paste supabase/VERIFY_CRON.sql to confirm."
