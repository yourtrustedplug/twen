#!/usr/bin/env bash
# Print how to create INSTAGRAM_ACCESS_TOKEN for verify-views, then optionally
# write tokens into .env if passed as args.
#
# Usage:
#   ./scripts/instagram-token-setup.sh
#   ./scripts/instagram-token-setup.sh <LONG_LIVED_USER_TOKEN> [IG_BUSINESS_ACCOUNT_ID]
set -euo pipefail
cd "$(dirname "$0")/.."

cat <<'EOF'
Instagram Reels verification (Graph API)
========================================
1) Create a Meta app: https://developers.facebook.com/apps/
2) Add Instagram Graph API (+ Instagram product / Business Login as required).
3) Connect an Instagram Professional account to a Facebook Page.
4) Generate a User access token with permissions such as:
     instagram_basic, pages_show_list, instagram_manage_insights
     (exact names vary by Meta app type — use Graph API Explorer).
5) Exchange for a long-lived token (~60 days):
     GET https://graph.facebook.com/v21.0/oauth/access_token
       ?grant_type=fb_exchange_token
       &client_id=APP_ID
       &client_secret=APP_SECRET
       &fb_exchange_token=SHORT_LIVED_TOKEN
6) Find Instagram Business Account ID:
     GET /me/accounts → Page id → GET /{page-id}?fields=instagram_business_account

Then:
  INSTAGRAM_ACCESS_TOKEN=…
  INSTAGRAM_BUSINESS_ACCOUNT_ID=…   # optional but helps match reel permalinks
  ./scripts/push-secrets.sh

verify-views uses oEmbed + /insights (plays/views) for approved Instagram submissions.
EOF

if [ "$#" -ge 1 ]; then
  TOKEN="$1"
  IG_USER="${2:-}"
  python3 - <<'PY' "$TOKEN" "$IG_USER"
from pathlib import Path
import sys
token, ig = sys.argv[1], sys.argv[2]
p = Path(".env")
lines = p.read_text().splitlines() if p.exists() else []
updates = {"INSTAGRAM_ACCESS_TOKEN": token}
if ig:
    updates["INSTAGRAM_BUSINESS_ACCOUNT_ID"] = ig
seen = set()
out = []
for line in lines:
    if "=" in line and not line.strip().startswith("#"):
        k = line.split("=", 1)[0].strip()
        if k in updates:
            out.append(f"{k}={updates[k]}")
            seen.add(k)
            continue
    out.append(line)
for k, v in updates.items():
    if k not in seen:
        out.append(f"{k}={v}")
p.write_text("\n".join(out) + "\n")
print("Wrote Instagram secrets to .env — run ./scripts/push-secrets.sh")
PY
fi
