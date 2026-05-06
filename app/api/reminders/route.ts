import { NextResponse } from "next/server";
import { fetchReminders } from "@/lib/caldav";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const reminders = await fetchReminders(s.location.timezone);
    return NextResponse.json({ reminders });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, reminders: [] }, { status: 500 });
  }
}
