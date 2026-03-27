import { NextRequest } from "next/server";

import { getCalendarFeedResponse } from "@/lib/calendar-feed-response";

type ParamsPromise = { params: Promise<{ token: string }> };

/** GET /api/calendar/feed/:token — тот же ICS, что и ?token=; удобнее для Google Calendar (cid без второго «?»). */
export async function GET(request: NextRequest, { params }: ParamsPromise) {
  const { token } = await params;
  return getCalendarFeedResponse(request, token);
}
