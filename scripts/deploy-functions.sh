#!/usr/bin/env bash
# Deploy Twen edge functions + print required secrets.
# Usage: ./scripts/deploy-functions.sh
# Requires: supabase CLI logged in as an account that OWNS the Twen project (utzkityhzxpzipvmdmxz)
# If link fails with privileges error, deploy from Dashboard or `supabase login` with the right org.
set -euo pipefail
cd "$(dirname "$0")/.."

REF="${VITE_SUPABASE_PROJECT_ID:-utzkityhzxpzipvmdmxz}"

echo "=== Deploy edge functions to $REF ==="
supabase functions deploy privy-exchange --project-ref "$REF" --no-verify-jwt
supabase functions deploy send-contact-email --project-ref "$REF" --no-verify-jwt
supabase functions deploy nardopay-webhook --project-ref "$REF" --no-verify-jwt
supabase functions deploy create-campaign-checkout --project-ref "$REF"
supabase functions deploy create-plan-checkout --project-ref "$REF"
supabase functions deploy request-creator-payout --project-ref "$REF"
supabase functions deploy verify-views --project-ref "$REF"
supabase functions deploy connect-social --project-ref "$REF"
supabase functions deploy social-oauth-callback --project-ref "$REF" --no-verify-jwt
supabase functions deploy verify-id --project-ref "$REF"
supabase functions deploy verify-submission --project-ref "$REF"

cat <<'EOF'

=== Set these secrets (Dashboard → Edge Functions → Secrets, or CLI) ===

supabase secrets set --project-ref utzkityhzxpzipvmdmxz \
  PRIVY_APP_ID="…" \
  PRIVY_APP_SECRET="…" \
  RESEND_API_KEY="…" \
  RESEND_FROM_EMAIL="Twen <onboarding@resend.dev>" \
  CONTACT_TO_EMAIL="hello@twen.app" \
  PAYOUT_OPS_EMAIL="hello@twen.app" \
  NARDOPAY_API_KEY="np_live_…" \
  NARDOPAY_API_URL="https://mczqwqsvumfsneoknlep.supabase.co/functions/v1/create-payment-link-api" \
  NARDOPAY_WEBHOOK_SECRET="long-random-shared-with-nardopay" \
  PUBLIC_APP_URL="https://YOUR_DOMAIN" \
  PRO_PLAN_AMOUNT="49" \
  CRON_SECRET="…" \
          TIKTOK_ACCESS_TOKEN="…" \
  TIKTOK_CLIENT_KEY="…" \
  TIKTOK_CLIENT_SECRET="…" \
  INSTAGRAM_APP_ID="…" \
  INSTAGRAM_APP_SECRET="…" \
  DIDIT_API_KEY="…"

Note: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically —
do not pass SUPABASE_* via `supabase secrets set` (CLI skips those names).

Paste ONE SQL file in Supabase SQL Editor:
  supabase/LAUNCH.sql
  (+ ADMIN_STAFF.sql if is_staff() is missing)

On NardoPay project, set the SAME NARDOPAY_WEBHOOK_SECRET so signatures match.

=== Alternative: GitHub Actions deploy ===
Repo → Settings → Secrets:
  SUPABASE_ACCESS_TOKEN  (https://supabase.com/dashboard/account/tokens)
  SUPABASE_PROJECT_REF   (utzkityhzxpzipvmdmxz)
Then Actions → "Deploy edge functions" → Run workflow
EOF
