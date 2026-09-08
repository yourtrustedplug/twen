#!/usr/bin/env bash
# Print hosting steps for twen.app + audience subdomains (owner runs deploy — no secrets printed).
set -euo pipefail
cd "$(dirname "$0")/.."
cat <<'EOF'
Host Twen on https://twen.app (+ subdomains)

DNS (Namecheap / registrar) — point all to the same Netlify or Vercel site:
  twen.app                → A / ALIAS (or CNAME www)
  www.twen.app            → CNAME → hosting
  creators.twen.app       → CNAME → hosting
  brands.twen.app         → CNAME → hosting
  admin.twen.app          → CNAME → hosting

In Netlify / Vercel: add each domain as an alias of the same project (same SPA).

Option A — Netlify
  npm run build
  npx netlify deploy --prod --dir=dist

Option B — Vercel
  npm run build
  npx vercel --prod

After the site serves the Vite app (not parking):
  1. In .env set:  PUBLIC_APP_URL=https://twen.app
  2. ./scripts/push-secrets.sh
  3. ./scripts/privy-set-domains.sh \
       https://twen.app \
       https://creators.twen.app \
       https://brands.twen.app \
       https://admin.twen.app
  4. TikTok + Meta redirect URI (apex is enough): https://twen.app/auth/social-callback
  5. ./scripts/check-remote.sh

Surfaces:
  https://twen.app            — pick creator / brand
  https://creators.twen.app   — creator marketing + /creator app
  https://brands.twen.app     — brand marketing + /brand app
  https://admin.twen.app      — staff /admin

SQL still required first (or in parallel):
  Paste supabase/PASTE_NEXT.sql in Supabase SQL Editor
EOF
