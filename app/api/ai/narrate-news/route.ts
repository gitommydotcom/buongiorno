import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/news";
import { getSettings } from "@/lib/settings";
import { newsNarrationPrompt } from "@/lib/prompts";
import { complete } from "@/lib/groq";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const news = await fetchNews(s.feeds);
    const items = [...news.local, ...news.italy, ...news.global]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 10);

    const { system, user } = newsNarrationPrompt({ language: s.language, items });
    const inputHash = items.map((i) => i.title).join("|").slice(0, 300);
    const text = await cached(`narration:news:${inputHash}`, 30 * 60, () => complete(system, user, { maxTokens: 700 }));

    return NextResponse.json({ text, items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
