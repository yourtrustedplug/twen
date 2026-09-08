#!/usr/bin/env bash
# Push browser build env to Vercel using unprefixed names (avoids VITE_ UI block).
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

SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
SUPABASE_PUBLISHABLE_KEY="${SUPABASE_PUBLISHABLE_KEY:-${VITE_SUPABASE_PUBLISHABLE_KEY:-}}"
PRIVY_APP_ID="${PRIVY_APP_ID:-${VITE_PRIVY_APP_ID:-}}"
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID:-${VITE_SUPABASE_PROJECT_ID:-}}"

need() {
  local k="$1"
  if [[ -z "${!k:-}" ]]; then
    echo "Missing $k in .env" >&2
    exit 1
  fi
}

need SUPABASE_URL
need SUPABASE_PUBLISHABLE_KEY
need PRIVY_APP_ID

if ! npx --yes vercel whoami >/dev/null 2>&1; then
  echo "Not logged into Vercel. Run: npx vercel login" >&2
  exit 1
fi

upsert() {
  local key="$1"
  local val="$2"
  npx --yes vercel env rm "$key" production --yes >/dev/null 2>&1 || true
  npx --yes vercel env rm "$key" preview --yes >/dev/null 2>&1 || true
  printf '%s' "$val" | npx --yes vercel env add "$key" production
  printf '%s' "$val" | npx --yes vercel env add "$key" preview
  echo "OK  $key"
}

upsert SUPABASE_URL "$SUPABASE_URL"
upsert SUPABASE_PUBLISHABLE_KEY "$SUPABASE_PUBLISHABLE_KEY"
upsert PRIVY_APP_ID "$PRIVY_APP_ID"

if [[ -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  upsert SUPABASE_PROJECT_ID "$SUPABASE_PROJECT_ID"
fi

echo "Redeploying production (no build cache)…"
npx --yes vercel --prod --force --yes

echo "Done. Hard-refresh https://www.twen.app/"
