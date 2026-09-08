#!/usr/bin/env bash
# Add origins to Privy allowed_domains (API). Usage:
#   ./scripts/privy-set-domains.sh http://localhost:8080 https://twen.app \
#     https://creator.twen.app https://brand.twen.app https://admin.twen.app
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
: "${PRIVY_APP_ID:?PRIVY_APP_ID missing}"
: "${PRIVY_APP_SECRET:?PRIVY_APP_SECRET missing}"
if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <origin> [origin...]"
  echo "Example: $0 http://localhost:8080 https://twen.app https://creator.twen.app https://brand.twen.app https://admin.twen.app"
  exit 1
fi

basic=$(printf '%s:%s' "$PRIVY_APP_ID" "$PRIVY_APP_SECRET" | base64)
current=$(curl -sS -H "Authorization: Basic ${basic}" -H "privy-app-id: ${PRIVY_APP_ID}" \
  "https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}" | python3 -c "import json,sys;print(','.join(json.load(sys.stdin).get('allowed_domains') or []))")

python3 - <<'PY' "$current" "$@"
import json, os, sys, urllib.request, base64

current = [d for d in sys.argv[1].split(",") if d]
wanted = list(dict.fromkeys(current + sys.argv[2:]))
app_id = os.environ["PRIVY_APP_ID"]
secret = os.environ["PRIVY_APP_SECRET"]
auth = base64.b64encode(f"{app_id}:{secret}".encode()).decode()
body = json.dumps({"allowed_domains": wanted}).encode()
req = urllib.request.Request(
    f"https://auth.privy.io/api/v1/apps/{app_id}",
    data=body,
    method="POST",
    headers={
        "Authorization": f"Basic {auth}",
        "privy-app-id": app_id,
        "Content-Type": "application/json",
    },
)
with urllib.request.urlopen(req) as res:
    data = json.load(res)
print("allowed_domains:", ", ".join(data.get("allowed_domains") or wanted))
PY
