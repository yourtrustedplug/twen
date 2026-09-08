#!/usr/bin/env bash
# Print hosting steps for twen.app + app subdomains (Namecheap DNS → Vercel).
set -euo pipefail
cd "$(dirname "$0")/.."
cat <<'EOF'
Host Twen: Namecheap DNS → Vercel (one project, several hostnames)

Marketing (always on apex):
  https://twen.app              — pick creator / brand
  https://twen.app/creators     — creator landing
  https://twen.app/brands       — brand landing

App subdomains (same Vercel deploy):
  https://creator.twen.app     — creator dashboard (/creator)
  https://brand.twen.app       — brand dashboard (/brand)
  https://admin.twen.app        — staff (/admin)

────────────────────────────────────────
1) Vercel — add domains (Project → Settings → Domains)
────────────────────────────────────────
  Add each of:
    twen.app
    www.twen.app
    creator.twen.app
    brand.twen.app
    admin.twen.app

  Vercel will show the exact DNS records to create (usually):
    A     @           76.76.21.21          (apex)
    CNAME www         cname.vercel-dns.com
    CNAME creators    cname.vercel-dns.com
    CNAME brands      cname.vercel-dns.com
    CNAME admin       cname.vercel-dns.com

  Prefer whatever Vercel displays for your project — copy those values.

────────────────────────────────────────
2) Namecheap — Advanced DNS
────────────────────────────────────────
  Domain List → twen.app → Advanced DNS

  Remove Namecheap parking / URL redirect / old host records that conflict.

  Add (Host = left column, Value = right):
    Type    Host        Value
    A       @           76.76.21.21
    CNAME   www         cname.vercel-dns.com
    CNAME   creator    cname.vercel-dns.com
    CNAME   brand      cname.vercel-dns.com
    CNAME   admin       cname.vercel-dns.com

  TTL: Automatic (or 5–30 min while testing).

  Wait until Vercel Domains shows each hostname as Valid / SSL issued
  (can take a few minutes to an hour).

────────────────────────────────────────
3) After DNS is green
────────────────────────────────────────
  1. PUBLIC_APP_URL=https://twen.app in .env
  2. ./scripts/push-secrets.sh
  3. ./scripts/privy-set-domains.sh \
       https://twen.app \
       https://www.twen.app \
       https://creator.twen.app \
       https://brand.twen.app \
       https://admin.twen.app
  4. TikTok + Meta redirect URI: https://twen.app/auth/social-callback
  5. ./scripts/check-remote.sh

SQL (if not done yet) — paste in Supabase SQL Editor:
  supabase/PASTE_NEXT.sql
EOF
