#!/usr/bin/env bash
# Live Twen remote readiness check (keys + edge functions).
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  echo "FAIL missing .env"
  exit 1
fi
set -a
# shellcheck disable=SC1091
. ./.env
set +a

FAIL=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAIL=1; }

BASE="${VITE_SUPABASE_URL:?VITE_SUPABASE_URL missing}"
KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:?VITE_SUPABASE_PUBLISHABLE_KEY missing}"

code=$(curl -s -o /tmp/unignored-rest-check.json -w "%{http_code}" \
  -H "apikey: ${KEY}" \
  -H "Authorization: Bearer ${KEY}" \
  "${BASE}/rest/v1/profiles?select=id&limit=1" || echo "000")

if [ "$code" = "200" ] || [ "$code" = "206" ]; then
  pass "REST API key ($code)"
else
  fail "REST API key HTTP $code — rotate keys in Supabase Dashboard → Project Settings → API, update .env"
  head -c 200 /tmp/unignored-rest-check.json; echo
fi

# SQL launch RPCs (service role) — presence check, not success of business logic
if [ -n "${SUPABASE_SECRET_KEY:-}" ]; then
  SVC="$SUPABASE_SECRET_KEY"
  rpc_ok() {
    local name="$1" body="$2"
    local out code
    code=$(curl -s -o /tmp/unignored-rpc.json -w "%{http_code}" -X POST \
      -H "apikey: ${SVC}" -H "Authorization: Bearer ${SVC}" \
      -H "Content-Type: application/json" \
      -d "$body" "${BASE}/rest/v1/rpc/${name}" || echo "000")
    if grep -q PGRST202 /tmp/unignored-rpc.json 2>/dev/null; then
      fail "rpc $name missing (paste supabase/LAUNCH.sql)"
    else
      pass "rpc $name (HTTP $code)"
    fi
  }
  rpc_ok confirm_campaign_funding '{"p_campaign_id":"00000000-0000-0000-0000-000000000001"}'
  rpc_ok confirm_plan_upgrade '{"p_user_id":"00000000-0000-0000-0000-000000000001"}'
  rpc_ok is_staff '{}'
  rpc_ok resolve_payout '{"p_payout_id":"00000000-0000-0000-0000-000000000001","p_status":"completed"}'
else
  fail "SUPABASE_SECRET_KEY missing — cannot verify launch RPCs"
fi

for fn in privy-exchange send-contact-email nardopay-webhook create-campaign-checkout create-plan-checkout request-creator-payout verify-views connect-social social-oauth-callback verify-id; do
  fcode=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "${BASE}/functions/v1/${fn}" || echo "000")
  if [ "$fcode" = "200" ] || [ "$fcode" = "204" ]; then
    pass "function $fn"
  else
    fail "function $fn HTTP $fcode (deploy with ./scripts/deploy-functions.sh)"
  fi
done

# Optional payment collection auth (does not create a payment link)
if [ -n "${NARDOPAY_API_KEY:-}" ]; then
  NP_URL="${NARDOPAY_API_URL:-https://mczqwqsvumfsneoknlep.supabase.co/functions/v1/create-payment-link-api}"
  npcode=$(curl -s -o /tmp/unignored-np.json -w "%{http_code}" \
    -X POST "$NP_URL" \
    -H "Authorization: Bearer ${NARDOPAY_API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}' || echo "000")
  # Valid key → validation error (400). Invalid key → 401.
  if [ "$npcode" = "400" ]; then
    pass "NardoPay API key"
  else
    fail "NardoPay API key HTTP $npcode (expected 400 validation with valid key)"
  fi
else
  fail "NARDOPAY_API_KEY missing in .env"
fi

# Resend API
if [ -n "${RESEND_API_KEY:-}" ]; then
  rcode=$(curl -s -o /tmp/unignored-resend.json -w "%{http_code}" \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    https://api.resend.com/domains || echo "000")
  if [ "$rcode" = "200" ]; then
    pass "Resend API key"
  else
    fail "Resend API key HTTP $rcode"
  fi
else
  fail "RESEND_API_KEY missing in .env"
fi

# Privy app credentials
if [ -n "${PRIVY_APP_ID:-}" ] && [ -n "${PRIVY_APP_SECRET:-}" ]; then
  basic=$(printf '%s:%s' "$PRIVY_APP_ID" "$PRIVY_APP_SECRET" | base64)
  pcode=$(curl -s -o /tmp/unignored-privy.json -w "%{http_code}" \
    -H "Authorization: Basic ${basic}" \
    -H "privy-app-id: ${PRIVY_APP_ID}" \
    "https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}" || echo "000")
  if [ "$pcode" = "200" ]; then
    pass "Privy app credentials"
    if command -v python3 >/dev/null 2>&1; then
      domains=$(python3 -c "import json;d=json.load(open('/tmp/unignored-privy.json'));print(','.join(d.get('allowed_domains') or []))")
      if [ -z "$domains" ]; then
        fail "Privy allowed_domains empty — add localhost + production host in Privy Dashboard"
      else
        pass "Privy allowed_domains ($domains)"
      fi
      google=$(python3 -c "import json;d=json.load(open('/tmp/unignored-privy.json'));print('1' if d.get('google_oauth') else '0')")
      email=$(python3 -c "import json;d=json.load(open('/tmp/unignored-privy.json'));print('1' if d.get('email_auth') else '0')")
      if [ "$google" = "1" ]; then
        pass "Privy Google OAuth enabled"
      elif [ "$email" = "1" ]; then
        pass "Privy Google OAuth off (email login OK — Google not required)"
      else
        fail "Privy Google OAuth disabled and email_auth off — enable a login method in Privy Dashboard"
      fi
    fi
  else
    fail "Privy app credentials HTTP $pcode"
  fi
else
  fail "PRIVY_APP_ID / PRIVY_APP_SECRET missing in .env"
fi

# Required secrets for deploy (informational fails for launch gate)
[ -n "${NARDOPAY_WEBHOOK_SECRET:-}" ] && pass "NARDOPAY_WEBHOOK_SECRET set" \
  || fail "NARDOPAY_WEBHOOK_SECRET missing (webhook will 503)"
[ -n "${PUBLIC_APP_URL:-}" ] && pass "PUBLIC_APP_URL set" \
  || fail "PUBLIC_APP_URL missing (checkout redirects + CORS)"
[ -n "${CRON_SECRET:-}" ] && pass "CRON_SECRET set" \
  || fail "CRON_SECRET missing (verify-views cron)"

# verify-views: auth + platform credentials
if [ -n "${CRON_SECRET:-}" ]; then
  vvcode=$(curl -s -o /tmp/unignored-vv.json -w "%{http_code}" -X POST \
    "${BASE}/functions/v1/verify-views" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -d '{}' || echo "000")
  if [ "$vvcode" = "401" ] || [ "$vvcode" = "403" ]; then
    fail "verify-views rejected CRON_SECRET (HTTP $vvcode) — re-push secrets"
  elif grep -q 'No view-verification credentials\|TIKTOK_ACCESS_TOKEN missing' /tmp/unignored-vv.json 2>/dev/null; then
    fail "verify-views needs TIKTOK_CLIENT_KEY+SECRET and/or TIKTOK_ACCESS_TOKEN and/or INSTAGRAM_ACCESS_TOKEN"
  elif [ "$vvcode" = "200" ] || [ "$vvcode" = "204" ]; then
    pass "verify-views cron auth (HTTP $vvcode)"
    mode=$(python3 -c "import json;d=json.load(open('/tmp/unignored-vv.json'));print(d.get('mode',''), d.get('tiktok_token_source',''))" 2>/dev/null || true)
    [ -n "$mode" ] && pass "verify-views mode ($mode)"
  else
    pass "verify-views reachable (HTTP $vvcode) — check body if unexpected"
  fi
fi

# Public app host + brand domain (launch-critical)
APP_HOST=$(echo "${PUBLIC_APP_URL:-https://twen.app}" | sed -E 's#https?://##' | cut -d/ -f1 | cut -d: -f1)
if [ "$APP_HOST" = "localhost" ] || [ "$APP_HOST" = "127.0.0.1" ]; then
  fail "PUBLIC_APP_URL is local ($APP_HOST) — set https://twen.app after hosting, then ./scripts/push-secrets.sh"
elif command -v dig >/dev/null 2>&1; then
  if dig +short A "$APP_HOST" | grep -q . || dig +short AAAA "$APP_HOST" | grep -q .; then
    pass "DNS $APP_HOST"
  else
    fail "DNS $APP_HOST (NXDOMAIN or no A/AAAA — register domain + point at host)"
  fi
fi
if command -v dig >/dev/null 2>&1; then
  if dig +short A twen.app | grep -q . || dig +short AAAA twen.app | grep -q .; then
    pass "DNS twen.app"
  else
    fail "DNS twen.app (NXDOMAIN — point DNS + host)"
  fi
fi

# Live site must serve the Vite app, not registrar parking
twen_hdr=$(curl -sI --max-time 10 "http://twen.app" 2>/dev/null | tr -d '\r' || true)
twen_body=$(curl -sL --max-time 12 "https://twen.app" 2>/dev/null | head -c 4000 || true)
if echo "$twen_hdr" | grep -qi 'namecheap\|parking'; then
  fail "twen.app still Namecheap parking — deploy Vite (Netlify/Vercel) to https://twen.app"
elif echo "$twen_body" | grep -qi 'namecheap\|This domain is parked\|Buy Domains'; then
  fail "twen.app parking page — deploy Vite app to https://twen.app"
elif echo "$twen_body" | grep -Eqi 'twen|vite|root|/assets/'; then
  pass "twen.app serves app HTML"
else
  fail "twen.app not serving app yet (empty/timeout/unknown) — finish hosting"
fi

# Creator OAuth tables (Connect TikTok/IG → verify-views)
if [ -n "${SUPABASE_SECRET_KEY:-}" ]; then
  for table in oauth_states creator_oauth_tokens; do
    tcode=$(curl -s -o /tmp/unignored-tbl.json -w "%{http_code}" \
      -H "apikey: ${SUPABASE_SECRET_KEY}" -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" \
      "${BASE}/rest/v1/${table}?select=*&limit=1" || echo "000")
    if [ "$tcode" = "200" ] || [ "$tcode" = "206" ]; then
      pass "table $table"
    else
      fail "table $table missing — paste supabase/PASTE_NEXT.sql"
    fi
  done

  # ID verification schema (verify-id + onboarding)
  pcode=$(curl -s -o /tmp/unignored-idcol.json -w "%{http_code}" \
    -H "apikey: ${SUPABASE_SECRET_KEY}" -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" \
    "${BASE}/rest/v1/profiles?select=id_document_path,first_name,last_name&limit=1" || echo "000")
  if [ "$pcode" = "200" ] || [ "$pcode" = "206" ]; then
    pass "profiles ID/onboarding columns"
  else
    fail "profiles missing id_document_path/first_name — paste supabase/PASTE_NEXT.sql"
  fi

  buckets=$(curl -s -H "apikey: ${SUPABASE_SECRET_KEY}" -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" \
    "${BASE}/storage/v1/bucket" || echo "[]")
  if echo "$buckets" | grep -q '"id-documents"'; then
    pass "storage bucket id-documents"
  else
    fail "storage bucket id-documents missing — paste supabase/PASTE_NEXT.sql"
  fi

  obcode=$(curl -s -o /tmp/unignored-ob.json -w "%{http_code}" -X POST \
    -H "apikey: ${SUPABASE_SECRET_KEY}" -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"uid":"00000000-0000-0000-0000-000000000001"}' \
    "${BASE}/rest/v1/rpc/profile_onboarding_complete" || echo "000")
  if [ "$obcode" = "200" ] || [ "$obcode" = "204" ]; then
    pass "rpc profile_onboarding_complete"
  else
    fail "rpc profile_onboarding_complete missing — paste supabase/PASTE_NEXT.sql"
  fi
fi

# Money path: anon/publishable must NOT execute confirm_campaign_funding
if [ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]; then
  acode=$(curl -s -o /tmp/unignored-anon-fund.json -w "%{http_code}" -X POST \
    -H "apikey: ${VITE_SUPABASE_PUBLISHABLE_KEY}" \
    -H "Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"p_campaign_id":"00000000-0000-0000-0000-000000000001","p_payment_ref":"probe"}' \
    "${BASE}/rest/v1/rpc/confirm_campaign_funding" || echo "000")
  if [ "$acode" = "401" ] || [ "$acode" = "403" ]; then
    pass "anon cannot confirm_campaign_funding (HTTP $acode)"
  elif [ "$acode" = "404" ]; then
    fail "confirm_campaign_funding missing for privilege probe — paste LAUNCH.sql"
  else
    fail "anon confirm_campaign_funding unexpected HTTP $acode (want 401/403)"
  fi

  wcode=$(curl -s -o /tmp/unignored-wh.json -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"event":"payment.completed","status":"completed"}' \
    "${BASE}/functions/v1/nardopay-webhook" || echo "000")
  if [ "$wcode" = "401" ]; then
    pass "nardopay-webhook rejects unsigned body"
  else
    fail "nardopay-webhook unsigned HTTP $wcode (want 401)"
  fi
fi

# Real view providers: prefer creator Connect; global tokens optional fallback
if [ -n "${TIKTOK_CLIENT_KEY:-}" ] && [ -n "${TIKTOK_CLIENT_SECRET:-}" ]; then
  pass "TIKTOK_CLIENT_KEY/SECRET set (creator Connect + client fallback)"
elif [ -n "${TIKTOK_ACCESS_TOKEN:-}" ]; then
  pass "TIKTOK_ACCESS_TOKEN set (global fallback)"
else
  fail "TikTok: set TIKTOK_CLIENT_KEY+SECRET for Connect TikTok"
fi
if [ -n "${INSTAGRAM_APP_ID:-}" ] && [ -n "${INSTAGRAM_APP_SECRET:-}" ]; then
  pass "INSTAGRAM_APP_ID/SECRET set (creator Connect)"
elif [ -n "${INSTAGRAM_ACCESS_TOKEN:-}" ]; then
  pass "INSTAGRAM_ACCESS_TOKEN set (global fallback)"
else
  fail "Instagram: set INSTAGRAM_APP_ID+SECRET for Connect Instagram"
fi

if [ "$FAIL" -ne 0 ]; then
  echo "=== REMOTE NOT READY ==="
  exit 1
fi
echo "=== REMOTE OK ==="
exit 0
