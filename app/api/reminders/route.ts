import { NextResponse } from "next/server";
import { fetchReminders } from "@/lib/caldav";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reminders = await fetchReminders();
    return NextResponse.json({ reminders });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, reminders: [] }, { status: 500 });
  }
}
