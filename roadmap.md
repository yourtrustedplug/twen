# Unignored rebuild — task list

- [x] Database: profiles, campaigns, submissions, earnings, payouts, wallet_transactions + escrow functions (fund/close/accrue/payout) + demo seeder
- [x] Security: RLS + GRANTs, authenticated-only policies
- [x] Auth: profiles with role, ensure-profile on sign-in, demo mode seeding + role switch
- [x] App shell: routes, role router, app header, ProtectedRoute roles
- [x] Brand side: dashboard, create campaign wizard, fund (escrow), review submissions, close/refund
- [x] Creator side: browse campaigns, brief + submit, my submissions, earnings + withdraw
- [x] Landing rewrite: Hero, Features, HowItWorks, earnings section, What-we-don't-do, Testimonials, FAQ, CTA, Navbar, Footer
- [x] Secondary pages: About, Pricing→How earnings work, Contact, 404, index.html metadata
- [x] Cleanup: remove invoice/client pages, components, hooks
- [x] Edge function: verify-views (scheduled, simulated until TikTok credentials added)
- [ ] Playwright verification pass
- [ ] NardoPay: waiting on API keys (add as secrets; wire into funding + payouts, no schema change needed)
