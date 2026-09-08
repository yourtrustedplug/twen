/** Twen Plus unlocks creator browse, messaging, and bookings. */
export const isPro = (profile: { plan?: string | null } | null | undefined) =>
  profile?.plan === 'pro';
