import { NextResponse } from "next/server";
import { fetchEvents, fetchReminders } from "@/lib/caldav";
import { fetchInbox } from "@/lib/gmail";
import { fetchTraffic } from "@/lib/traffic";
import { fetchWeather } from "@/lib/weather";
import { fetchNews } from "@/lib/news";
import { getSettings } from "@/lib/settings";
import { startOfDay, addDays } from "@/lib/utils";
import { dayNarrationPrompt } from "@/lib/prompts";
import { complete } from "@/lib/groq";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const userName = process.env.USER_NAME || "tu";
    const now = new Date();
    const start = startOfDay(now, s.location.timezone);
    const end = addDays(start, 1);

    const [events, reminders, weather, traffic, mail, news] = await Promise.all([
      fetchEvents(start, end, s.location.timezone).catch(() => []),
      fetchReminders(s.location.timezone).catch(() => []),
      fetchWeather(s.location.lat, s.location.lon, s.location.name, s.location.timezone).catch(() => null),
      fetchTraffic(s.location.lat, s.location.lon).catch(() => []),
      fetchInbox(20).catch(() => []),
      fetchNews(s.feeds).catch(() => ({ local: [], italy: [], global: [] })),
    ]);

    const importantMail = mail.filter((m) => m.important || m.starred || m.unread).slice(0, 6);

    const newsHeadlines = [
      ...news.local.slice(0, 2),
      ...news.italy.slice(0, 3),
      ...news.global.slice(0, 2),
    ].map((n) => ({ source: n.source, title: n.title }));

    const { system, user } = dayNarrationPrompt({
      language: s.language,
      userName,
      now,
      timezone: s.location.timezone,
      events,
      reminders,
      weather,
      traffic,
      importantMail,
      newsHeadlines,
      customPrompt: s.aiPrompts?.day,
    });

    const inputHash = JSON.stringify({
      e: events.map((e) => e.uid + e.start),
      r: reminders.map((r) => r.uid + (r.due ?? "")),
      w: weather?.current.observedAt,
      t: traffic.length,
      m: importantMail.map((m) => m.id),
      n: newsHeadlines.map((h) => h.title).slice(0, 5).join("|"),
      d: start.toISOString(),
      p: s.aiPrompts?.day ?? "",
    });
    const text = await cached(`narration:day:${inputHash}`, 10 * 60, () => complete(system, user, { maxTokens: 700 }));

    return NextResponse.json({ text, generatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
