/** Keep defaults in sync with src/lib/plan.ts */
export const DEFAULT_BRAND_PLUS_AMOUNT = 49
export const DEFAULT_CREATOR_PRO_AMOUNT = 9

export function planAmountForRole(role: string | null | undefined): number {
  if (role === 'creator') {
    return Number(Deno.env.get('CREATOR_PRO_AMOUNT') ?? String(DEFAULT_CREATOR_PRO_AMOUNT))
  }
  return Number(
    Deno.env.get('PRO_PLAN_AMOUNT') ??
      Deno.env.get('BRAND_PLUS_AMOUNT') ??
      String(DEFAULT_BRAND_PLUS_AMOUNT),
  )
}
