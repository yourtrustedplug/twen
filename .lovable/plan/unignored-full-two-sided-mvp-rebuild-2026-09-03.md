# Unignored — full two-sided MVP rebuild

Rebuild Invofy into **Unignored**: a marketplace where brands fund campaigns and creators get paid per verified view, with mobile-money payouts. Keep the existing visual design system (fonts, tokens, Hero/Features/HowItWorks section layouts, auth + demo-mode flow) and swap all product logic and copy.

## 1. Branding & landing rewrite

- Rename everywhere (Navbar, Footer, dashboard headers, index.html title/description/OG tags): **Unignored** — "Get paid per view".
- Landing sections rewritten with the provided copy:
  - Hero: "Brands fund a campaign. Creators post videos. Everyone gets paid per view, straight to mobile money." Demo-mode CTA stays.
  - Features → creator-side differentiators (escrow-funded campaigns, no follower minimum, own account/audience, mobile-money payout, live remaining budget).
  - HowItWorks → 3 steps: Browse campaigns → Post to your own account → Withdraw to mobile money.
  - "What we don't do" section (new): the four explicit exclusions from the copy.
  - Pricing → replaced by "How earnings work" (rate per 1,000 views, verification window) rather than subscription tiers.
  - Testimonials/FAQ → rewritten around the two-sided model.
  - About/Contact pages → re-pointed at Unignored's mission.
- Hero keeps "Try Demo Mode" (anonymous sign-in seeds sample campaigns + submissions).

## 2. Database (migration tool)

Drop/retire `invoices` + `clients` usage in code (tables can be left in place, ignored). New tables, each with GRANTs + RLS in the same migration:

- **profiles** — one row per user: `role` ('creator' | 'brand'), full name, phone, TikTok handle, payout provider ('mtn_momo' | 'airtel_money') + payout number, ID verification status, brand company fields. Role stored here only (no client-side role checks for anything privileged).
- **campaigns** — brand-owned: title, brief fields (topic, angle, must-include, avoid, hashtags, disclosure), budget, rate_per_1k_views, deadline, status ('draft' | 'funding' | 'open' | 'closed' | 'completed'), escrow amounts (funded / spent / remaining), supplied asset links.
- **submissions** — creator + campaign: TikTok URL, status ('submitted' | 'approved' | 'rejected'), verified_views, last_verified_at, earnings_accrued, rejection reason.
- **earnings** — ledger rows per submission per verification run: views delta, amount, campaign + budget references.
- **payouts** — creator withdrawal requests: amount, provider, phone, status ('pending' | 'processing' | 'paid' | 'failed'), verification-window release date.
- **wallet_transactions** — brand funding in / escrow hold / refund; creator earnings credit / payout debit.

Escrow math enforced in database functions (spend can never exceed funded budget; unspent returns as refund entry on campaign close).

## 3. Auth & roles

- Signup collects email/password (plus Google via existing SocialAuthButtons) **and a role choice** — the signup form branches: creators enter TikTok handle + payout provider/number; brands enter business name.
- AuthContext extended with `profile` and role helpers. Protected routes resolve role and route to `/brand` or `/creator`.
- Demo mode seeds: one open campaign (escrowed), a few submissions with earnings for a creator view, and a brand-side campaign with submissions to review.
- Keep `/auth/callback`, `DEFAULT_AUTHED_ROUTE` contract; after auth, land on the role's dashboard.

## 4. Brand side

- **Dashboard** — campaigns list with funded / spent / remaining / views; "New campaign" CTA.
- **Create campaign wizard** — budget, rate per 1,000 views, deadline, brief fields, hashtags, assets. Est. reach preview (budget ÷ rate).
- **Fund & escrow** — "Fund campaign" moves the full budget into escrow and opens it to creators. Payment runs through a NardoPay edge function; until keys are added the ledger records a pending/external funding and the campaign opens in a clearly marked unfunded test state. NardoPay API keys will be added via secrets (no code change needed to go live).
- **Review submissions** — video link, creator, running view count; approve/reject with reason before it earns.
- **Close/refund** — closed campaigns return unspent escrow as a refund ledger entry.

## 5. Creator side

- **Browse campaigns** — cards showing brand, rate, remaining budget (live), deadline. Open campaigns only.
- **Campaign brief page** — full brief, supplied assets, disclosure requirements, "Submit your video" with TikTok URL.
- **My submissions** — each with status, verified views, earnings to date, and next verification refresh.
- **Earnings & withdraw** — balance, verification-window hold explanation, withdraw form (MTN MoMo / Airtel Money, payout number) creating a payout request.

## 6. View verification & earnings engine

- Edge function `verify-views` on a schedule (pg_cron every 15 min): for each approved submission, sync views and accrue earnings = delta × rate ÷ 1,000, capped by remaining campaign budget; inauthentic-pattern flagging placeholder.
- Pluggable adapter design: a TikTok API credential (secret) activates real verification; until provided, the function runs in simulated mode (realistic incremental growth) so the whole flow works end to end today.
- Budget exhaustion stops accrual and marks the campaign completed.

## 7. Cleanup

- Remove invoice/client pages, invoice components, and their routes; replace `/dashboard` with a role router. Update Sidebar-equivalent nav, 404 page, and all copy.

## 8. Verification of the build

- Playwright pass over: landing render, demo mode seeding both role views, create + fund + review flow as a brand, browse + submit + see simulated earnings as a creator, withdraw request recorded.
- Check console/network for errors; confirm RLS by querying cross-user access.
