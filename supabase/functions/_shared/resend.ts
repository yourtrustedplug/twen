import { createClient } from 'npm:@supabase/supabase-js@2'
import { roleScopedAppUrl } from './hosts.ts'
import {
  campaignsHomeUrl,
  kycRejectedMail,
  kycUrl,
  kycVerifiedMail,
  type Mail,
} from './mail.ts'

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function userClient(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  return createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function emailFromAuthUser(user: {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}): string | null {
  const fromAuth = user.email?.trim().toLowerCase()
  if (fromAuth && fromAuth.includes('@')) return fromAuth
  const meta = user.user_metadata?.email
  if (typeof meta === 'string' && meta.includes('@')) return meta.trim().toLowerCase()
  return null
}

export function greetingName(profile: {
  first_name?: string | null
  full_name?: string | null
  company_name?: string | null
} | null | undefined): string {
  const first = profile?.first_name?.trim()
  if (first) return first
  const fromFull = profile?.full_name?.trim()?.split(/\s+/)[0]
  if (fromFull) return fromFull
  return profile?.company_name?.trim() || ''
}

export async function authEmailFor(
  admin: ReturnType<typeof adminClient>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error) {
    console.error('auth email lookup', userId, error.message)
    return null
  }
  return data.user ? emailFromAuthUser(data.user) : null
}

export async function sendResendEmail(mail: Mail & { to: string }): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Twen <hello@twen.app>'
  if (!apiKey) {
    console.error('email skipped — RESEND_API_KEY is not set')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
    })
    if (res.ok) return true
    console.error('Resend error', res.status, (await res.text()).slice(0, 400))
    return false
  } catch (e) {
    console.error('Resend send failed', e)
    return false
  }
}

export async function emailUser(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  mail: Mail,
): Promise<boolean> {
  const to = await authEmailFor(admin, userId)
  if (!to) {
    console.error('email skipped — user has no email', userId)
    return false
  }
  return sendResendEmail({ to, ...mail })
}

export async function requireAuthedUser(req: Request) {
  const userSb = userClient(req)
  const { data, error } = await userSb.auth.getUser()
  if (error || !data.user) return { error: 'Sign in first' as const, status: 401 as const }
  return { user: data.user, userSb, admin: adminClient() }
}

export async function requireStaff(req: Request) {
  const authed = await requireAuthedUser(req)
  if ('error' in authed) return authed
  const { data: staffProfile } = await authed.admin
    .from('profiles')
    .select('role')
    .eq('id', authed.user.id)
    .maybeSingle()
  if (staffProfile?.role !== 'moderator' && staffProfile?.role !== 'admin') {
    return { error: 'Only staff can do that' as const, status: 403 as const }
  }
  return authed
}

export function appUrl() {
  return Deno.env.get('PUBLIC_APP_URL') ?? 'https://twen.app'
}

export async function emailKycDecision(
  admin: ReturnType<typeof adminClient>,
  opts: { userId: string; firstName?: string | null; status: 'verified' | 'rejected' },
): Promise<boolean> {
  const creatorOrigin = roleScopedAppUrl(appUrl(), 'creator')
  const mail =
    opts.status === 'verified'
      ? kycVerifiedMail({ firstName: opts.firstName, campaignsUrl: campaignsHomeUrl(creatorOrigin) })
      : kycRejectedMail({ firstName: opts.firstName, kycUrl: kycUrl(creatorOrigin) })
  return emailUser(admin, opts.userId, mail)
}
