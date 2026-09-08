#!/usr/bin/env bash
# Print the only remaining launch unblockers (Twen / Unignored).
cat <<'EOF'
Project: utzkityhzxpzipvmdmxz (Twen)

Done: REST, LAUNCH RPCs, edge functions (incl. connect-social), Privy localhost,
      TikTok client key/secret on edge, verify-views uses creator_oauth_tokens.

You said you'll handle hosting. After Vite is on https://twen.app:

  1) PUBLIC_APP_URL=https://twen.app in .env
     ./scripts/push-secrets.sh
     ./scripts/privy-set-domains.sh \
       https://twen.app \
       https://creators.twen.app \
       https://brands.twen.app \
       https://admin.twen.app
     # DNS: same SPA aliases for creators / brands / admin .twen.app

  2) Paste SQL (Supabase SQL Editor) — clipboard has supabase/PASTE_NEXT.sql:
     PROFILE_ABOUT (names/geo + OAuth + id-documents) + ONBOARDING gates in one file
   Then: ./scripts/paste-cron-sql.sh   # fills CRON_SECRET → clipboard
         paste supabase/VERIFY_CRON.sql to confirm schedule

  3) Instagram Login app: INSTAGRAM_APP_ID + INSTAGRAM_APP_SECRET → push-secrets
     TikTok Login Kit redirect URIs:
       http://localhost:8080/auth/social-callback
       https://twen.app/auth/social-callback

  4) Align NardoPay webhook secret with NARDOPAY_WEBHOOK_SECRET

Verify: ./scripts/check-remote.sh
EOF
