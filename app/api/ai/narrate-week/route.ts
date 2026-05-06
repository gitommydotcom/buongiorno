import { NextResponse } from "next/server";
import { fetchEvents, fetchReminders } from "@/lib/caldav";
import { getSettings } from "@/lib/settings";
import { startOfDay, addDays } from "@/lib/utils";
import { weekNarrationPrompt } from "@/lib/prompts";
import { complete } from "@/lib/groq";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const userName = process.env.USER_NAME || "tu";
    const now = new Date();
    const start = startOfDay(now, s.location.timezone);
    const end = addDays(start, 7);

    const [events, reminders] = await Promise.all([
      fetchEvents(start, end).catch(() => []),
      fetchReminders().catch(() => []),
    ]);

    const { system, user } = weekNarrationPrompt({
      language: s.language,
      userName,
      now,
      timezone: s.location.timezone,
      events,
      reminders,
    });

    const inputHash = `${events.length}:${events.slice(0, 5).map((e) => e.uid).join("|")}:${reminders.length}`;
    const text = await cached(`narration:week:${inputHash}`, 30 * 60, () => complete(system, user, { maxTokens: 500 }));

    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
