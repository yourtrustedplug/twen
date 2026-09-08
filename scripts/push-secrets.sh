#!/usr/bin/env bash
# Push local .env secrets to Twen edge functions.
# Requires: supabase CLI logged in as Twen project OWNER (not frontier/OCA token).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

REF="${VITE_SUPABASE_PROJECT_ID:-utzkityhzxpzipvmdmxz}"

need() {
  if [ -z "${!1:-}" ]; then
    echo "Missing $1 in .env"
    exit 1
  fi
}

need PRIVY_APP_ID
need PRIVY_APP_SECRET
need NARDOPAY_API_KEY
need NARDOPAY_WEBHOOK_SECRET
need RESEND_API_KEY
need CRON_SECRET
# SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected by the platform — do not set via CLI
# (names starting with SUPABASE_ are reserved / skipped by `supabase secrets set`).

PUBLIC_APP_URL="${PUBLIC_APP_URL:-http://localhost:5173}"
NARDOPAY_API_URL="${NARDOPAY_API_URL:-https://mczqwqsvumfsneoknlep.supabase.co/functions/v1/create-payment-link-api}"
RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-Twen <onboarding@resend.dev>}"
CONTACT_TO_EMAIL="${CONTACT_TO_EMAIL:-hello@twen.app}"
PAYOUT_OPS_EMAIL="${PAYOUT_OPS_EMAIL:-$CONTACT_TO_EMAIL}"
PRO_PLAN_AMOUNT="${PRO_PLAN_AMOUNT:-49}"

echo "=== Pushing secrets to $REF (owner privileges required) ==="
ARGS=(
  PRIVY_APP_ID="$PRIVY_APP_ID"
  PRIVY_APP_SECRET="$PRIVY_APP_SECRET"
  NARDOPAY_API_KEY="$NARDOPAY_API_KEY"
  NARDOPAY_API_URL="$NARDOPAY_API_URL"
  NARDOPAY_WEBHOOK_SECRET="$NARDOPAY_WEBHOOK_SECRET"
  RESEND_API_KEY="$RESEND_API_KEY"
  RESEND_FROM_EMAIL="$RESEND_FROM_EMAIL"
  CONTACT_TO_EMAIL="$CONTACT_TO_EMAIL"
  PAYOUT_OPS_EMAIL="$PAYOUT_OPS_EMAIL"
  PUBLIC_APP_URL="$PUBLIC_APP_URL"
  PRO_PLAN_AMOUNT="$PRO_PLAN_AMOUNT"
  CRON_SECRET="$CRON_SECRET"
)

if [ -n "${TIKTOK_ACCESS_TOKEN:-}" ]; then
  ARGS+=(TIKTOK_ACCESS_TOKEN="$TIKTOK_ACCESS_TOKEN")
fi
if [ -n "${TIKTOK_CLIENT_KEY:-}" ]; then
  ARGS+=(TIKTOK_CLIENT_KEY="$TIKTOK_CLIENT_KEY")
fi
if [ -n "${TIKTOK_CLIENT_SECRET:-}" ]; then
  ARGS+=(TIKTOK_CLIENT_SECRET="$TIKTOK_CLIENT_SECRET")
fi
if [ -n "${TIKTOK_REFRESH_TOKEN:-}" ]; then
  ARGS+=(TIKTOK_REFRESH_TOKEN="$TIKTOK_REFRESH_TOKEN")
fi
if [ -n "${INSTAGRAM_ACCESS_TOKEN:-}" ]; then
  ARGS+=(INSTAGRAM_ACCESS_TOKEN="$INSTAGRAM_ACCESS_TOKEN")
fi
if [ -n "${INSTAGRAM_APP_ID:-}" ]; then
  ARGS+=(INSTAGRAM_APP_ID="$INSTAGRAM_APP_ID")
fi
if [ -n "${INSTAGRAM_APP_SECRET:-}" ]; then
  ARGS+=(INSTAGRAM_APP_SECRET="$INSTAGRAM_APP_SECRET")
fi
if [ -n "${INSTAGRAM_BUSINESS_ACCOUNT_ID:-}" ]; then
  ARGS+=(INSTAGRAM_BUSINESS_ACCOUNT_ID="$INSTAGRAM_BUSINESS_ACCOUNT_ID")
fi
if [ -n "${ALLOW_SIMULATED_VIEWS:-}" ]; then
  ARGS+=(ALLOW_SIMULATED_VIEWS="$ALLOW_SIMULATED_VIEWS")
fi

supabase secrets set --project-ref "$REF" "${ARGS[@]}"

echo
echo "Also set the SAME NARDOPAY_WEBHOOK_SECRET on the NardoPay project."
echo "Then: ./scripts/deploy-functions.sh"
