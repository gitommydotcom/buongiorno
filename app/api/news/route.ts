import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/news";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const news = await fetchNews(s.feeds);
    return NextResponse.json(news);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, local: [], italy: [], global: [] }, { status: 500 });
  }
}
