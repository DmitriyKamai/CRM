/** HTTPS URL фида → webcal:// для подписки в Календаре Apple (macOS / iOS). */
export function toWebCalSubscribeUrl(httpsFeedUrl: string): string {
  const u = new URL(httpsFeedUrl);
  return `webcal://${u.host}${u.pathname}${u.search}`;
}

/** Ссылка «открыть в Google Календаре» (подписка по URL). */
export function toGoogleCalendarSubscribeUrl(httpsFeedUrl: string): string {
  const u = new URL(httpsFeedUrl);
  const webcal = `webcal://${u.host}${u.pathname}${u.search}`;
  return `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
}
