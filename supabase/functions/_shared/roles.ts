/** Role checks for creator/brand actions. Staff can act as both. */
export function isStaffRole(role: string | null | undefined): boolean {
  return role === 'moderator' || role === 'admin'
}

export function profileHasRole(
  profile: { role?: string | null; roles?: unknown },
  wanted: string,
): boolean {
  const bag = new Set<string>()
  if (profile.role) bag.add(profile.role)
  if (Array.isArray(profile.roles)) {
    for (const role of profile.roles) {
      if (typeof role === 'string' && role.trim()) bag.add(role)
    }
  }
  const staff = [...bag].some(isStaffRole)
  if (isStaffRole(wanted)) return staff
  if (staff && (wanted === 'creator' || wanted === 'brand')) return true
  return bag.has(wanted)
}
