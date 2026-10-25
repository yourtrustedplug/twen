# Local testing harness

This harness runs Twen against a **local Supabase stack** so test accounts can
exercise the brand → creator → admin → views → payout/refund flow without
touching the production project (`utzkityhzxpzipvmdmxz`) or charging a real
card.

It is intentionally separate from production:

- No production fake-payment bypass is added to the app.
- Simulated funding calls the **same trusted database function** the real
  NardoPay webhook calls.
- Local-only edge functions hard-fail unless `LOCAL_TEST_MODE=true` **and** the
  Supabase runtime is local.
- The browser helpers also require a development build, a localhost page, and a
  local Supabase URL.
- Local functions are excluded from the production deploy allowlists.

## Requirements

- Node.js and npm
- Docker Desktop, or Colima (`brew install colima docker`)
- Supabase CLI
- `.env.production` containing the public Privy app id (`VITE_PRIVY_APP_ID` or
  `PRIVY_APP_ID`). It is already committed in this repo.

## Quick start

Run each command in its own terminal:

```sh
# 1. Start local Supabase, write local env files, and seed test accounts.
npm run local:start

# 2. Serve edge functions with LOCAL_TEST_MODE=true.
npm run local:functions

# 3. Start the app.
npm run dev
```

Open **http://localhost:8080/local-test**.

If Vite prints a different port, use that port instead. The local harness does
not depend on the Vite port for funding or submission.

`npm run local:start` starts Colima when Docker is not already running. On a
fresh stack it applies the full migration chain plus the local bootstrap
migrations. It is safe to re-run; it only starts what is missing.

## Test accounts

All accounts use the same password:

| Role | Email | Password |
| --- | --- | --- |
| Brand | `brand@twen.test` | `TwenLocalTest!2026` |
| Creator | `creator@twen.test` | `TwenLocalTest!2026` |
| Admin | `admin@twen.test` | `TwenLocalTest!2026` |

The seeded creator has TikTok connected, ID verification approved, **Creator
Pro** enabled, and an MTN MoMo withdrawal account. Pro is enabled so released
earnings can be paid out immediately instead of waiting seven days.

The seed also creates a draft campaign:

> **Local Test — Coffee Launch** · $100 budget · $2.00 / 1,000 views

## Full manual flow

1. **Brand creates a campaign**
   - Sign in as the test brand.
   - Open **New Campaign**.
   - Upload a cover image, fill the brief, choose TikTok, and continue.
   - Set a budget and a deadline at least 15 days out.
   - Click **Simulate $100.00 test payment** (the amount follows the budget).
   - The campaign becomes `open` and funded through the local funding endpoint.

2. **Creator submits a video**
   - Sign in as the test creator.
   - Open the campaign and click **Submit**.
   - The video URL is prefilled with a fake TikTok URL in local mode.
   - Tick every checklist item and click **Submit for review**.
   - No TikTok or Meta request is made.

3. **Admin approves**
   - Sign in as the test admin.
   - The submission appears in **Review queue**.
   - Click **Approve**.

4. **Accrue views**

   ```sh
   npm run local:views -- --views 25000
   ```

   This calls the same `accrue_views` database function the production view
   verifier uses. Re-running it adds more views; it never lowers the count.

5. **Close the campaign**

   ```sh
   npm run local:close
   ```

   The script backdates the deadline and calls the real `close_campaign`
   function. It queues unused escrow as a brand refund. With the seeded Pro
   creator, opening **Creator → Earnings** then queues the released earnings as
   a payout.

6. **Admin resolves the payout and refund**
   - In the admin panel, click **Mark paid** for the creator payout.
   - Click **Mark returned** for the brand refund.
   - Emails are skipped when `RESEND_API_KEY` is absent; the status changes still
     work.

## Commands

| Command | What it does |
| --- | --- |
| `npm run local:start` | Start Colima/Supabase if needed, write local env files, seed accounts |
| `npm run local:reset` | Wipe the local database, reapply every migration, and reseed |
| `npm run local:stop` | Stop the local Supabase containers (keeps data) |
| `npm run local:status` | Print local API URLs and keys |
| `npm run local:functions` | Serve all edge functions with `LOCAL_TEST_MODE=true` |
| `npm run local:seed` | Re-apply test accounts, profile data, and the draft campaign |
| `npm run local:views -- --views 25000` | Accrue views on the newest approved submission |
| `npm run local:views -- --submission <uuid> --views 25000` | Target a specific submission |
| `npm run local:close` | Expire and close the newest open campaign |
| `npm run local:close -- --campaign <uuid>` | Close a specific campaign |

`npm run local:reset` is the recovery command when a local-only schema fix has
not been applied yet. It destroys local data and reseeds from scratch.

## What is simulated vs. real

| Step | Local harness | Production |
| --- | --- | --- |
| Campaign payment | Local-only edge function calls `confirm_campaign_funding` | NardoPay checkout + signed webhook call the same function |
| Creator submission | Local-only edge function inserts a submitted row | TikTok/Meta OAuth + `verify-submission` |
| View counts | `accrue_views` called by a local script | `verify-views` calls `accrue_views` |
| Review, close, refund, earnings, payout ledger | Real database functions and RLS | Same |
| Mobile-money transfer | Marked complete manually in admin | Marked complete manually in admin |
| Email delivery | Skipped without `RESEND_API_KEY` | Resend |

## Safety model

- `LOCAL_TEST_MODE=true` is written only to gitignored local env files:
  `.env.local` and `supabase/functions/.env.local`.
- The browser helpers return false outside development, outside localhost, or
  when `VITE_SUPABASE_URL` is not local.
- The local edge functions return `404` unless `LOCAL_TEST_MODE=true` and
  `SUPABASE_URL` is a local runtime.
- The seed, view, and close scripts refuse any Supabase API URL that is not
  `localhost`/`127.0.0.1`/`::1`.
- `local-test-fund-campaign` and `local-test-submit` are not listed in
  `scripts/deploy-functions.sh` or `.github/workflows/deploy-functions.yml`.
- The simulated funding endpoint only works on a draft campaign owned by the
  signed-in brand. It never calls NardoPay.
- No production project, production secrets, or production database are used.

## Local bootstrap migrations

Production has some SQL that was applied manually and is not represented in the
historical migration chain. A fresh local database would otherwise miss it.
These files live in `supabase/local/migrations/` and are copied into
`supabase/migrations/` only for the duration of a local start/reset, then
removed by `scripts/local/with-local-migrations.sh` (including on failure).

They restore or adapt:

- the private `campaign-assets` storage bucket
- `profiles.plan_payment_ref`
- brand kit fields
- the `admin` role and staff review policies
- creator access to campaigns they submitted to (needed to release earnings)
- payout statuses written by the ops functions
- the `refund_ops` wallet audit type
- the local welcome-conversation SQL

These are local-only compatibility fixes. They do not add a payment bypass and
are never copied into production by the harness.

## Known caveats

- **Vector/logflare are excluded.** Colima cannot mount its Docker socket into
  the vector container. Auth, REST, storage, edge functions, and the app are
  unaffected; only local log collection is missing.
- **TikTok/Meta verification cannot run offline.** The local submit endpoint is
  the only reason the creator flow can be tested without live OAuth tokens.
- **Privy is not used for local sign-in.** The local page uses Supabase
  email/password accounts because the Privy app secret is not available
  locally. The public Privy app id is still present so the app can boot.
- **Vite may choose another port.** If `8080` is busy, open the URL Vite prints.
  Email links in local function env still point at `8080`; funding and
  submission do not depend on it.
- **`supabase status` may list stopped services.** `imgproxy`, `analytics`,
  `vector`, and `pooler` can be stopped by the local start flags. They are not
  needed for this harness.
- **Do not run `supabase db push`.** It would target a linked project. Use the
  `npm run local:*` scripts only.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Cannot connect to the Docker daemon` | Run `colima start`, or start Docker Desktop |
| Browser shows no local-test link | Confirm `.env.local` has `VITE_LOCAL_TEST_MODE=true`, then restart `npm run dev` |
| `Bucket not found` when uploading a cover | Run `npm run local:reset` to apply the local storage bootstrap |
| Admin review queue is empty | Run `npm run local:reset`; staff policies come from the local bootstrap |
| Mark paid fails on a status constraint | Run `npm run local:reset`; the local bootstrap allows the ops statuses |
| Mark returned fails on a wallet type constraint | Run `npm run local:reset`; `refund_ops` is added locally |
| Function returns `404 Not found` | Restart `npm run local:functions`; confirm `LOCAL_TEST_MODE=true` in `supabase/functions/.env.local` |
| Emails show `could not be sent` | Expected without `RESEND_API_KEY`; status changes still apply |

## Clean up

```sh
npm run local:stop
```

To remove the generated local env files and any backup from a pre-existing
file:

```sh
rm -f .env.local .env.local.before-local-harness
rm -f supabase/functions/.env.local supabase/functions/.env.local.before-local-harness
```

Do not commit `.env.local`, `supabase/.branches/`, or any local database
artifacts. They are gitignored.
