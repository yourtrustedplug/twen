/** Deterministic cartoon avatar for an account that has no uploaded photo. */
export const cartoonAvatar = (id: string) => {
  const seed = encodeURIComponent(id || 'twen');
  return `https://api.dicebear.com/9.x/adventurer/png?seed=${seed}&size=512&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
};
