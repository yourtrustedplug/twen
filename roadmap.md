# Unignored rebuild — task list

- [x] Database: profiles, campaigns, submissions, earnings, payouts, wallet_transactions + escrow functions (fund/close/accrue/payout) + demo seeder
- [x] Security: RLS + GRANTs, authenticated-only policies
- [ ] Auth: profiles with role, ensure-profile on sign-in, demo mode seeding + role switch
- [ ] App shell: routes, role router, app header, ProtectedRoute roles
- [ ] Brand side: dashboard, create campaign wizard, fund (escrow), review submissions, close/refund
- [ ] Creator side: browse campaigns, brief + submit, my submissions, earnings + withdraw
- [ ] Landing rewrite: Hero, Features, HowItWorks, earnings section, What-we-don't-do, Testimonials, FAQ, CTA, Navbar, Footer
- [ ] Secondary pages: About, Pricing→How earnings work, Contact, 404, index.html metadata
- [ ] Cleanup: remove invoice/client pages, components, hooks
- [ ] Edge function: verify-views (scheduled, simulated until TikTok credentials added)
- [ ] Playwright verification pass
- [ ] NardoPay: waiting on API keys (add as secrets; wire into funding + payouts, no schema change needed)
