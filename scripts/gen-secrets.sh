#!/usr/bin/env bash
# Print suggested random secrets for Twen edge/cron setup (does not write .env).
set -euo pipefail
echo "Add these to .env AND Supabase Edge Function secrets (and NardoPay webhook secret):"
echo
echo "NARDOPAY_WEBHOOK_SECRET=$(openssl rand -hex 32)"
echo "CRON_SECRET=$(openssl rand -hex 32)"
echo
echo "Also set:"
echo "  PUBLIC_APP_URL=https://YOUR_HOSTED_URL"
echo "  TIKTOK_ACCESS_TOKEN=…   # or leave unset and keep ALLOW_SIMULATED_VIEWS unset (fail-closed)"
echo
echo "Resend: verify a sending domain for Twen (current Resend account has"
echo "thecubicleafrica.com in failed status). Until then FROM can stay onboarding@resend.dev."
