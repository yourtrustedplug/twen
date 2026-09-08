# Auth (Privy + Supabase)

> **Rules:**
>
> - **SSO / email login:** render `<SocialAuthButtons>` from
>   `@/components/base/social-auth-buttons` (Privy Google + email). Do not call
>   Lovable OAuth or `supabase.auth.signInWithOAuth`.
> - **Session:** Privy authenticates the human; `privy-exchange` edge function mints a
>   Supabase session so RLS (`auth.uid()`) keeps working.
> - **Post-auth land:** `DEFAULT_AUTHED_ROUTE` (`/dashboard` → role home).

## Flow

1. Home: pick creator or brand → Privy modal opens on the same page
   (or land directly on `creators.twen.app` / `brands.twen.app`).
2. `AuthProvider` sees Privy `authenticated`, calls `supabase.functions.invoke('privy-exchange')`.
3. Edge function verifies the Privy JWT, ensures a Supabase auth user, returns access + refresh tokens.
4. Client `supabase.auth.setSession(...)`; profile is ensured in `profiles`.
5. `AuthRedirect` sends them to their role home.

Subdomains (same SPA deploy):

| Host | Surface |
|---|---|
| `twen.app` | Audience gate |
| `creators.twen.app` | Creator marketing + `/creator` app |
| `brands.twen.app` | Brand marketing + `/brand` app |
| `admin.twen.app` | Staff `/admin` |

Allowlist all four origins in Privy. Edge CORS allows sibling subdomains of `PUBLIC_APP_URL`.

Get Started / Sign Up elsewhere also opens the Privy modal (`useStartAuth`).
`/signin` is only a fallback for protected routes (opens the same modal).
`/signup` redirects to `/`.

## Files

| File | Job |
|---|---|
| `src/providers/PrivyProvider.tsx` | `PrivyProvider` with app id + login methods |
| `src/hooks/use-start-auth.ts` | Opens the Privy modal; stashes role for first profile |
| `src/components/AuthRedirect.tsx` | After login from marketing, land on role home |
| `src/components/base/social-auth-buttons.tsx` | Optional Google + email buttons (not the home path) |
| `src/contexts/AuthContext.tsx` | Sync Privy → Supabase, profile, signOut |
| `supabase/functions/privy-exchange` | Verify Privy token → Supabase session |
| `src/lib/auth-routes.ts` | `DEFAULT_AUTHED_ROUTE` / `SIGNED_OUT_ROUTE` |

## Env

Frontend: `VITE_PRIVY_APP_ID`, `VITE_SUPABASE_*`, optional `VITE_PRIVY_GOOGLE_ENABLED=true`  
Edge secrets: `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`

Google login is gated by `VITE_PRIVY_GOOGLE_ENABLED` so the UI does not offer Google while the
Privy app still has `google_oauth=false`.

## Signup role

There is no separate signup. Privy login creates the account if it does not exist.

Home (`/`) is where new users pick creator or brand. That choice is stored
(`pending-signup` + remembered audience) and applied on the **first** profile insert
during `privy-exchange`. Existing accounts keep the role they already have.

Privy is a popup on that pick — there is no signup form. Profile extras
(name, TikTok, company, payout) live on the in-app profile screens after login.
