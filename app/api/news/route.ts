import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/news";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const news = await fetchNews(s.feeds);
    return NextResponse.json(news, {
      headers: {
        // Browser/CDN caching: stale-while-revalidate per servire subito la copia
        // cached e refresh in background. Allinea con il TTL del cache server.
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=1800",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, local: [], italy: [], global: [] }, { status: 500 });
  }
}
