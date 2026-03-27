/** HTTPS URL фида → webcal:// для подписки в Календаре Apple (macOS / iOS). */
export function toWebCalSubscribeUrl(httpsFeedUrl: string): string {
  const u = new URL(httpsFeedUrl);
  return `webcal://${u.host}${u.pathname}${u.search}`;
}

/** Ссылка «открыть в Google Календаре» (подписка по URL). */
export function toGoogleCalendarSubscribeUrl(httpsFeedUrl: string): string {
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(httpsFeedUrl)}`;
}
