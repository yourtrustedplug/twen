const defaultNardoUrl =
  'https://mczqwqsvumfsneoknlep.supabase.co/functions/v1/create-payment-link-api'

export function amountsMatch(left: unknown, right: unknown) {
  const a = Number(left)
  const b = Number(right)
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 0.01
}

export function nardoPayApiUrl() {
  return Deno.env.get('NARDOPAY_API_URL')?.trim() ||
    (Deno.env.get('ALLOW_DEFAULT_NARDOPAY_URL') === 'true' ? defaultNardoUrl : '')
}

export async function createNardoPayPaymentLink(body: Record<string, unknown>) {
  const apiKey = Deno.env.get('NARDOPAY_API_KEY')
  if (!apiKey) return { error: 'NardoPay is not configured', status: 500 as const }

  const apiUrl = nardoPayApiUrl()
  if (!apiUrl) return { error: 'NARDOPAY_API_URL is not configured', status: 500 as const }

  const npRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const npJson = await npRes.json().catch(() => ({})) as {
    url?: string
    link_code?: string
    link_id?: string
    message?: string
  }
  if (!npRes.ok || !npJson?.url) {
    console.error('NardoPay create link failed', npRes.status, npJson)
    return { error: npJson?.message || 'Could not create payment link', status: 502 as const }
  }
  return {
    url: npJson.url as string,
    link_code: npJson.link_code as string | undefined,
    link_id: npJson.link_id as string | undefined,
  }
}
