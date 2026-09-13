/**
 * send-contact-email — public contact form → inbox row, then Resend.
 *
 * Secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY
 *   RESEND_API_KEY, RESEND_FROM_EMAIL, CONTACT_TO_EMAIL
 * CONTACT_TO_EMAIL is the live inbox. hello@twen.app is the public address once Zoho is live.
 *
 * A saved row is enough to return 200 so a Resend outage does not drop the message.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsForRequest, jsonResponseFor } from '../_shared/cors.ts'

type ContactBody = {
  fullName?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 255
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsForRequest(req) })
  }

  if (req.method !== 'POST') {
    return jsonResponseFor(req, { error: 'Method not allowed' }, 405)
  }

  let body: ContactBody
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const fullName = (body.fullName ?? '').trim()
  const email = (body.email ?? '').trim()
  const phone = (body.phone ?? '').trim().slice(0, 40)
  const subject = (body.subject ?? '').trim()
  const message = (body.message ?? '').trim()

  if (!fullName || fullName.length > 100) {
    return jsonResponseFor(req, { error: 'Name is required' }, 400)
  }
  if (!isValidEmail(email)) {
    return jsonResponseFor(req, { error: 'Valid email is required' }, 400)
  }
  if (!subject || subject.length > 200) {
    return jsonResponseFor(req, { error: 'Subject is required' }, 400)
  }
  if (!message || message.length > 1000) {
    return jsonResponseFor(req, { error: 'Message is required' }, 400)
  }

  const admin = adminClient()
  let storedId: string | null = null
  if (admin) {
    const { data, error } = await admin
      .from('contact_messages')
      .insert({
        full_name: fullName,
        email,
        phone,
        subject,
        message,
      })
      .select('id')
      .maybeSingle()
    if (error) {
      console.error('contact_messages insert', error.message)
    } else {
      storedId = data?.id ?? null
    }
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Twen <hello@twen.app>'
  const to = Deno.env.get('CONTACT_TO_EMAIL') ?? 'hello@twen.app'
  let emailed = false
  let emailError: string | null = null

  if (apiKey) {
    const html = `
      <h2>New contact message</h2>
      <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone || '—')}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replaceAll('\n', '<br />')}</p>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[Contact] ${subject}`,
        html,
      }),
    })

    if (res.ok) {
      emailed = true
      if (admin && storedId) {
        const { error } = await admin
          .from('contact_messages')
          .update({ emailed_at: new Date().toISOString() })
          .eq('id', storedId)
        if (error) console.error('contact_messages emailed_at', error.message)
      }
    } else {
      emailError = `${res.status} ${(await res.text()).slice(0, 400)}`
      console.error('Resend error', emailError)
    }
  } else {
    emailError = 'RESEND_API_KEY is not set'
    console.error(emailError)
  }

  if (storedId || emailed) {
    return jsonResponseFor(req, { ok: true, stored: Boolean(storedId), emailed })
  }

  return jsonResponseFor(
    req,
    { error: 'Could not send your message. Email hello@twen.app instead.' },
    502,
  )
})
