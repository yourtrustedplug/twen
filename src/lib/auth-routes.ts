import { getAppTenant, getHostname, isLocalApex } from "./hosts";

/**
 * The single source of truth for post-auth navigation.
 *
 * After sign-in, sign-up confirmation, or an OAuth callback the user lands HERE — the
 * app's first authenticated screen — never `/` (the marketing landing).
 * See docs/design/auth.md.
 */
export const DEFAULT_AUTHED_ROUTE = "/dashboard";

/**
 * Splash / Privy on a tenant host (creator.twen.app) or localhost.
 * Apex marketing never uses this — signed-out people go to `/` and pick a role.
 */
export const SIGNED_OUT_ROUTE = "/signin";

/** Where to send someone with no session. Apex → home gate; app hosts keep splash. */
export function signedOutPath(): string {
  if (typeof window === "undefined") return "/";
  if (isLocalApex(getHostname())) return SIGNED_OUT_ROUTE;
  if (getAppTenant() === "apex") return "/";
  return SIGNED_OUT_ROUTE;
}
