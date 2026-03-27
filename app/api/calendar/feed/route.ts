import { NextRequest } from "next/server";

import { getCalendarFeedResponse } from "@/lib/calendar-feed-response";

/** GET /api/calendar/feed?token=... — фид в формате ICS (устаревший формат URL, см. /feed/[token]). */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  return getCalendarFeedResponse(request, token);
}
