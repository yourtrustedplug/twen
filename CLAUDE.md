# CLAUDE.md — Twen

Guidance for AI edits. Read before changing auth or sign-in UI.

## Layout

- Pages are PascalCase files at the top of `src/pages/` (`SignIn.tsx`, `Dashboard.tsx`, …).
  Routes are wired in `src/App.tsx`.
- Shared, brand-level components live in `src/components/base/`. Everything else is a
  domain component under `src/components/<area>/`, and shadcn primitives stay in
  `src/components/ui/`.
- Auth state comes from `src/contexts/AuthContext.tsx` (Privy + Supabase session sync);
  protected pages are wrapped in `ProtectedRoute` (`src/components/ProtectedRoute.tsx`).

## Don'ts

1. Don't hand-roll "Continue with Google" buttons — use `SocialAuthButtons`
   (`src/components/base/social-auth-buttons.tsx`) or `useStartAuth` (Privy modal).
   Google only appears when `VITE_PRIVY_GOOGLE_ENABLED=true` (Privy Dashboard must
   have Google OAuth on + domains allowlisted).
2. Don't call `supabase.auth.signInWithOAuth` and don't use the Lovable OAuth broker.
   Identity is Privy; data access is Supabase via `privy-exchange`.
3. Don't put secrets in `VITE_*` env vars. Only `VITE_PRIVY_APP_ID`, optional
   `VITE_PRIVY_GOOGLE_ENABLED`, and publishable Supabase keys belong in the browser.
4. Don't hardcode post-auth paths. Import `DEFAULT_AUTHED_ROUTE` / `SIGNED_OUT_ROUTE`
   from `src/lib/auth-routes.ts`.
5. Don't let clients update `profiles.role` or `profiles.plan` — DB triggers block it;
   promote moderators via SQL with the service role.
6. Don't add a separate signup page. Privy login is signup. Role is chosen on `/`
   (creator vs brand); `useStartAuth` opens the Privy modal on that click.

See `docs/design/auth.md` for the full auth contract.
