import { fetchEvents, fetchReminders } from "@/lib/caldav";
import { fetchInbox } from "@/lib/gmail";
import { fetchTraffic } from "@/lib/traffic";
import { fetchWeather } from "@/lib/weather";
import { fetchNews } from "@/lib/news";
import { getSettings } from "@/lib/settings";
import { startOfDay, addDays, withTimeout } from "@/lib/utils";
import { dayNarrationPrompt } from "@/lib/prompts";
import { completeStream } from "@/lib/groq";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const userName = process.env.USER_NAME || "tu";
    const now = new Date();
    const start = startOfDay(now, s.location.timezone);
    const end = addDays(start, 1);

    // Per-source timeouts so the slowest integration can't block the whole brief.
    // Total worst case ≈ 6s before AI starts streaming.
    const [events, reminders, weather, traffic, mail, news] = await Promise.all([
      withTimeout(fetchEvents(start, end, s.location.timezone), 6000, []),
      withTimeout(fetchReminders(s.location.timezone), 6000, []),
      withTimeout(fetchWeather(s.location.lat, s.location.lon, s.location.name, s.location.timezone), 4000, null),
      withTimeout(fetchTraffic(s.location.lat, s.location.lon), 3000, []),
      withTimeout(fetchInbox(20), 4000, []),
      withTimeout(fetchNews(s.feeds), 5000, { local: [], italy: [], global: [] }),
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
      basePrompt: s.aiPrompts?.baseDay,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const piece of completeStream(system, user, { maxTokens: 500 })) {
            controller.enqueue(encoder.encode(piece));
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`\n\n[errore AI: ${(err as Error).message}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return new Response(`errore: ${(e as Error).message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
