import { NextResponse } from "next/server";
import { fetchEvents } from "@/lib/caldav";
import { getSettings } from "@/lib/settings";
import { startOfDay, addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const now = new Date();
    const start = startOfDay(now, s.location.timezone);
    const end = addDays(start, 7);
    const events = await fetchEvents(start, end, s.location.timezone);
    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, events: [] }, { status: 500 });
  }
}
