/** Канонический путь публичной страницы психолога: `/{slug}` или `/{profileId}`. */
export function psychologistPublicProfilePath(profile: {
  id: string;
  publicSlug: string | null;
}): string {
  return `/${profile.publicSlug ?? profile.id}`;
}
