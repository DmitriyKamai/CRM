/** Канонический путь: `/{slug}` при алиасе или `/id{N}` по порядку регистрации. */
export function psychologistPublicProfilePath(profile: {
  publicSlug: string | null;
  publicRouteSerial: number;
}): string {
  const slug = profile.publicSlug?.trim().toLowerCase();
  if (slug) return `/${slug}`;
  return `/id${profile.publicRouteSerial}`;
}
