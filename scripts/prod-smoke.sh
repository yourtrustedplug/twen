#!/usr/bin/env bash
# Production readiness smoke checks — exit 0 only if all pass.
set -euo pipefail
cd "$(dirname "$0")/.."
FAIL=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAIL=1; }

echo "=== Twen prod smoke $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

# Build
if npm run build >/tmp/unignored-build.log 2>&1; then pass "vite build"; else fail "vite build"; tail -20 /tmp/unignored-build.log; fi

# Types
if npx tsc --noEmit >/tmp/unignored-tsc.log 2>&1; then pass "typescript"; else fail "typescript"; cat /tmp/unignored-tsc.log; fi

# Secrets not in VITE_ / not tracked
if git check-ignore -q .env; then pass ".env gitignored"; else fail ".env not gitignored"; fi
if git ls-files --error-unmatch .env >/dev/null 2>&1; then fail ".env still tracked"; else pass ".env untracked"; fi
if rg -n "VITE_.*(SECRET|PRIVY_APP_SECRET|NARDOPAY|RESEND_API)" .env.example 2>/dev/null; then fail "secret in VITE_ example"; else pass "no VITE_ secrets in example"; fi

# Auth stack
test -f src/providers/PrivyProvider.tsx && pass "PrivyProvider" || fail "PrivyProvider missing"
test -f supabase/functions/privy-exchange/index.ts && pass "privy-exchange fn" || fail "privy-exchange missing"
rg -q "integrations/lovable|previewAuthStorage|@lovable.dev/cloud-auth" src && fail "lovable auth stubs remain" || pass "no lovable auth stubs"


# Legal + admin
rg -q 'path="/terms"' src/App.tsx && pass "terms route" || fail "terms route"
rg -q 'path="/privacy"' src/App.tsx && pass "privacy route" || fail "privacy route"
rg -q 'path="/admin"' src/App.tsx && pass "admin route" || fail "admin route"
test -f src/pages/AdminPanel.tsx && pass "AdminPanel" || fail "AdminPanel"

# Edge functions present
test -f supabase/functions/send-contact-email/index.ts && pass "send-contact-email" || fail "send-contact-email"
test -f supabase/functions/verify-views/index.ts && pass "verify-views" || fail "verify-views"
test -f supabase/functions/create-campaign-checkout/index.ts && pass "create-campaign-checkout" || fail "create-campaign-checkout"
test -f supabase/functions/nardopay-webhook/index.ts && pass "nardopay-webhook" || fail "nardopay-webhook"
test -f supabase/functions/request-creator-payout/index.ts && pass "request-creator-payout" || fail "request-creator-payout"
test -f supabase/functions/create-plan-checkout/index.ts && pass "create-plan-checkout" || fail "create-plan-checkout"
test -f supabase/LAUNCH.sql && pass "LAUNCH.sql" || fail "LAUNCH.sql"
test -f supabase/VERIFY_LAUNCH.sql && pass "VERIFY_LAUNCH.sql" || fail "VERIFY_LAUNCH.sql"
test -f supabase/PATCH_PAYMENT_IDEMPOTENCY.sql && pass "PATCH_PAYMENT_IDEMPOTENCY.sql" || fail "PATCH_PAYMENT_IDEMPOTENCY.sql"
test -f supabase/migrations/20260907150000_payment_idempotency.sql && pass "payment_idempotency migration" || fail "payment_idempotency migration"
rg -q "ALLOW_SIMULATED_VIEWS" supabase/functions/verify-views/index.ts && pass "verify-views fail-closed hook" || fail "verify-views"
rg -q "create-campaign-checkout" src/pages --glob '*.tsx' && pass "UI invokes checkout" || fail "UI still uses ledger fund"
rg -q "request-creator-payout" src/pages --glob '*.tsx' && pass "UI invokes payout queue" || fail "UI still raw request_payout"
rg -q "create-plan-checkout" src --glob '*.{ts,tsx}' && pass "UI invokes plan checkout" || fail "Pro checkout not wired"
rg -q "rpc\\(['\"]fund_campaign" src --glob '*.{ts,tsx}' && fail "client still calls fund_campaign" || pass "no client fund_campaign"
test -f supabase/NARDOPAY_FUNDING.sql && pass "NARDOPAY_FUNDING.sql" || fail "NARDOPAY_FUNDING.sql"
test -f supabase/PAYOUTS_OPS.sql && pass "PAYOUTS_OPS.sql" || fail "PAYOUTS_OPS.sql"
test -f scripts/deploy-functions.sh && pass "deploy-functions.sh" || fail "deploy-functions.sh"
test -f scripts/push-secrets.sh && pass "push-secrets.sh" || fail "push-secrets.sh"
test -f supabase/CRON_VERIFY_VIEWS.sql && pass "CRON_VERIFY_VIEWS.sql" || fail "CRON_VERIFY_VIEWS.sql"
rg -q "nardopay_webhook_secret" supabase/functions/nardopay-webhook/index.ts \
  && fail "webhook has hardcoded default secret" || pass "webhook secret fail-closed"
rg -q "corsForRequest" supabase/functions/privy-exchange/index.ts \
  && rg -q "corsForRequest" supabase/functions/create-campaign-checkout/index.ts \
  && rg -q "corsForRequest" supabase/functions/create-plan-checkout/index.ts \
  && rg -q "corsForRequest" supabase/functions/request-creator-payout/index.ts \
  && rg -q "corsForRequest" supabase/functions/send-contact-email/index.ts \
  && rg -q "corsForRequest" supabase/functions/connect-social/index.ts \
  && rg -q "corsForRequest" supabase/functions/social-oauth-callback/index.ts \
  && rg -q "corsForRequest" supabase/functions/verify-id/index.ts \
  && pass "browser fns use corsForRequest" || fail "browser fns missing corsForRequest"

# Known blockers (informational — live probes; do not fail smoke)
echo "--- blockers (manual ops) ---"
if [ -f .env ]; then
  set -a; # shellcheck disable=SC1091
  . ./.env
  set +a
fi
BASE="${VITE_SUPABASE_URL:-}"
SVC="${SUPABASE_SECRET_KEY:-}"
if [ -n "$BASE" ] && [ -n "$SVC" ]; then
  if curl -s -o /tmp/smoke-rpc.json -X POST \
    -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" \
    -d '{"p_campaign_id":"00000000-0000-0000-0000-000000000001"}' \
    "$BASE/rest/v1/rpc/confirm_campaign_funding" | grep -q PGRST202; then
    echo "BLOCK paste supabase/LAUNCH.sql (confirm_campaign_funding missing)"
  else
    pass "LAUNCH RPCs present remotely"
  fi
else
  echo "BLOCK cannot probe LAUNCH RPCs (missing URL/secret)"
fi
if [ -z "${NARDOPAY_WEBHOOK_SECRET:-}" ] || [ -z "${CRON_SECRET:-}" ]; then
  echo "BLOCK local secrets missing — run ./scripts/gen-secrets.sh and add to .env"
elif [[ "${PUBLIC_APP_URL:-}" == *"localhost"* ]] || [[ "${PUBLIC_APP_URL:-}" == *"127.0.0.1"* ]]; then
  echo "BLOCK PUBLIC_APP_URL still local (${PUBLIC_APP_URL}) — set production host before launch"
fi
if [ -n "${PRIVY_APP_ID:-}" ] && [ -n "${PRIVY_APP_SECRET:-}" ]; then
  basic=$(printf '%s:%s' "$PRIVY_APP_ID" "$PRIVY_APP_SECRET" | base64)
  curl -s -o /tmp/smoke-privy.json \
    -H "Authorization: Basic ${basic}" -H "privy-app-id: ${PRIVY_APP_ID}" \
    "https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}" >/dev/null || true
  domains=$(python3 -c "import json;d=json.load(open('/tmp/smoke-privy.json'));print(','.join(d.get('allowed_domains') or []))" 2>/dev/null || true)
  if [ -z "$domains" ]; then
    echo "BLOCK Privy: allowlist domains empty (add localhost + prod host)"
  else
    pass "Privy allowed_domains ($domains)"
  fi
  google=$(python3 -c "import json;d=json.load(open('/tmp/smoke-privy.json'));print('1' if d.get('google_oauth') else '0')" 2>/dev/null || echo 0)
  email=$(python3 -c "import json;d=json.load(open('/tmp/smoke-privy.json'));print('1' if d.get('email_auth') else '0')" 2>/dev/null || echo 0)
  if [ "$google" != "1" ] && [ "$email" = "1" ]; then
    pass "Privy Google off (email login OK)"
  elif [ "$google" != "1" ]; then
    echo "BLOCK Privy: no Google and no email login method"
  fi
fi
if [ -z "${TIKTOK_ACCESS_TOKEN:-}" ] && { [ -z "${TIKTOK_CLIENT_KEY:-}" ] || [ -z "${TIKTOK_CLIENT_SECRET:-}" ]; }; then
  echo "BLOCK TikTok: add TIKTOK_CLIENT_KEY+SECRET (sandbox) and/or TIKTOK_ACCESS_TOKEN, then ./scripts/push-secrets.sh"
fi
if [ -z "${INSTAGRAM_APP_ID:-}" ] || [ -z "${INSTAGRAM_APP_SECRET:-}" ]; then
  if [ -z "${INSTAGRAM_ACCESS_TOKEN:-}" ]; then
    echo "BLOCK Instagram: set INSTAGRAM_APP_ID+SECRET (Connect) or INSTAGRAM_ACCESS_TOKEN fallback"
  fi
fi
echo "BLOCK Resend: verify Twen sending domain (API key OK; custom domain may still be pending)"
echo "BLOCK MoMo still ops-manual (NardoPay has no public disbursement API key)"
if command -v dig >/dev/null 2>&1; then
  if dig +short A twen.app | grep -q . || dig +short AAAA twen.app | grep -q .; then
    pass "DNS twen.app"
  else
    echo "BLOCK public domain: twen.app is NXDOMAIN (point DNS + host Vite build)"
  fi
fi
echo "NOTE paste supabase/CRON_VERIFY_VIEWS.sql after TikTok secret is on the edge"

# Live remote probe (informational)
if [ -n "${VITE_SUPABASE_URL:-}" ] && [ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]; then
  code=$(curl -s -o /tmp/unignored-rest.json -w "%{http_code}" \
    -H "apikey: ${VITE_SUPABASE_PUBLISHABLE_KEY}" \
    -H "Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}" \
    "${VITE_SUPABASE_URL}/rest/v1/profiles?select=id&limit=1" || echo "000")
  if [ "$code" = "200" ] || [ "$code" = "206" ]; then
    pass "remote REST key accepted ($code)"
  else
    echo "BLOCK remote REST key invalid/unauthorized (HTTP $code) — refresh publishable + secret in Dashboard → .env"
  fi
  for fn in privy-exchange nardopay-webhook create-campaign-checkout create-plan-checkout request-creator-payout verify-views send-contact-email connect-social social-oauth-callback verify-id; do
    fcode=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "${VITE_SUPABASE_URL}/functions/v1/${fn}" || echo "000")
    if [ "$fcode" = "200" ] || [ "$fcode" = "204" ]; then
      pass "remote fn $fn ($fcode)"
    else
      echo "BLOCK remote fn missing/undeployed: $fn (HTTP $fcode)"
    fi
  done
fi

if [ "$FAIL" -ne 0 ]; then
  echo "=== RESULT: NOT READY (automated failures) ==="
  exit 1
fi
echo "=== RESULT: CODEBASE SMOKE OK (ops blockers may remain) ==="
exit 0
