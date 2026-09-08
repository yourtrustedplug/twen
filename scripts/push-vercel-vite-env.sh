#!/usr/bin/env bash
# Push frontend VITE_* vars from local .env into the linked Vercel project.
# Requires: npx vercel login && npx vercel link
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source ./.env
set +a

need() {
  local k="$1"
  if [[ -z "${!k:-}" ]]; then
    echo "Missing $k in .env" >&2
    exit 1
  fi
}

need VITE_SUPABASE_URL
need VITE_SUPABASE_PUBLISHABLE_KEY
need VITE_PRIVY_APP_ID

if ! npx --yes vercel whoami >/dev/null 2>&1; then
  echo "Not logged into Vercel. Run: npx vercel login" >&2
  exit 1
fi

upsert() {
  local key="$1"
  local val="$2"
  # Remove existing (ignore failure), then add for production + preview
  npx --yes vercel env rm "$key" production --yes >/dev/null 2>&1 || true
  npx --yes vercel env rm "$key" preview --yes >/dev/null 2>&1 || true
  printf '%s' "$val" | npx --yes vercel env add "$key" production
  printf '%s' "$val" | npx --yes vercel env add "$key" preview
  echo "OK  $key"
}

upsert VITE_SUPABASE_URL "$VITE_SUPABASE_URL"
upsert VITE_SUPABASE_PUBLISHABLE_KEY "$VITE_SUPABASE_PUBLISHABLE_KEY"
upsert VITE_PRIVY_APP_ID "$VITE_PRIVY_APP_ID"

if [[ -n "${VITE_SUPABASE_PROJECT_ID:-}" ]]; then
  upsert VITE_SUPABASE_PROJECT_ID "$VITE_SUPABASE_PROJECT_ID"
fi

if [[ -n "${VITE_PRIVY_GOOGLE_ENABLED:-}" ]]; then
  upsert VITE_PRIVY_GOOGLE_ENABLED "$VITE_PRIVY_GOOGLE_ENABLED"
fi

echo "Redeploying production (no build cache)…"
npx --yes vercel --prod --force --yes

echo "Done. Hard-refresh https://www.twen.app/"
