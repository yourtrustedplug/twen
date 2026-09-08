/**
 * send-contact-email — public contact form → Resend.
 *
 * Secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY, RESEND_FROM_EMAIL, CONTACT_TO_EMAIL
 */
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsForRequest(req) })
  }

  if (req.method !== 'POST') {
    return jsonResponseFor(req, { error: 'Method not allowed' }, 405)
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Twen <onboarding@resend.dev>'
  const to = Deno.env.get('CONTACT_TO_EMAIL') ?? 'hello@twen.app'

  if (!apiKey) {
    return jsonResponseFor(req, { error: 'Email is not configured' }, 500)
  }

  let body: ContactBody
  try {
    body = await req.json()
  } catch {
    return jsonResponseFor(req, { error: 'Invalid JSON' }, 400)
  }

  const fullName = (body.fullName ?? '').trim()
  const email = (body.email ?? '').trim()
  const phone = (body.phone ?? '').trim()
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

  if (!res.ok) {
    const errText = await res.text()
    console.error('Resend error', res.status, errText)
    return jsonResponseFor(req, { error: 'Failed to send email' }, 502)
  }

  const data = await res.json()
  return jsonResponseFor(req, { ok: true, id: data.id })
})
