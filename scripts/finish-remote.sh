#!/usr/bin/env bash
# After you paste LAUNCH.sql + login with owner token, run this to finish remote setup.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== 1) Verify SQL applied ==="
set -a; # shellcheck disable=SC1091
. ./.env
set +a
code=$(curl -s -o /tmp/launch-check.json -w "%{http_code}" -X POST \
  -H "apikey: ${SUPABASE_SECRET_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_campaign_id":"00000000-0000-0000-0000-000000000001"}' \
  "${VITE_SUPABASE_URL}/rest/v1/rpc/confirm_campaign_funding")
# Missing function → 404 PGRST202. Present → 400/404 campaign not found / 200.
if grep -q PGRST202 /tmp/launch-check.json 2>/dev/null; then
  echo "FAIL: LAUNCH.sql not applied yet (confirm_campaign_funding missing)."
  echo "Paste supabase/LAUNCH.sql in SQL Editor and re-run."
  exit 1
fi
echo "PASS: confirm_campaign_funding exists (HTTP $code)"

echo "=== 2) Push secrets + deploy functions ==="
./scripts/push-secrets.sh
./scripts/deploy-functions.sh

echo "=== 3) Remote check ==="
./scripts/check-remote.sh || true
echo
echo "Next: Privy allowlist localhost + paste CRON_VERIFY_VIEWS.sql after deploy."
