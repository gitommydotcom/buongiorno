import Parser from "rss-parser";
import { cached } from "./cache";
import type { Feed } from "./settings";

export type NewsCategory = "local" | "italy" | "global";

export type NewsItem = {
  category: NewsCategory;
  source: string;
  title: string;
  link: string;
  publishedAt: string; // ISO
  summary: string;
  image?: string;
};

const SPORT_TERMS = [
  "sport", "calcio", "serie a", "serie b", "champions", "europa league",
  "tennis", "basket", "volley", "f1", "formula 1", "motogp", "ciclismo",
  "milan ", "inter ", "juventus", "napoli ", "roma ", "lazio ", "fiorentina",
  "atalanta", "bologna ", "udinese", "torino ", "salernitana", "monza ",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parser = new Parser<any, any>({
  timeout: 12000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; BuongiornoBot/1.0)" },
  customFields: {
    item: [
      ["media:content", "media:content", { keepArray: false }],
      ["media:thumbnail", "media:thumbnail", { keepArray: false }],
      ["image", "image"],
    ],
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImage(item: Record<string, any>): string | undefined {
  // enclosure is a native rss-parser field
  const enc = item.enclosure as { url?: string; type?: string } | undefined;
  if (enc?.url && (!enc.type || enc.type.startsWith("image"))) return enc.url;

  const mc = item["media:content"];
  if (mc) {
    const url = mc?.$ ?.url ?? mc?.url ?? (Array.isArray(mc) ? mc[0]?.$ ?.url ?? mc[0]?.url : undefined);
    if (url && typeof url === "string") return url;
  }

  const mt = item["media:thumbnail"];
  if (mt) {
    const url = mt?.$ ?.url ?? mt?.url ?? (Array.isArray(mt) ? mt[0]?.$ ?.url ?? mt[0]?.url : undefined);
    if (url && typeof url === "string") return url;
  }

  if (typeof item.image === "string" && item.image.startsWith("http")) return item.image;

  // Parse first image from HTML content
  const html: string = item["content:encoded"] ?? item.content ?? "";
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m?.[1]) return m[1];

  return undefined;
}

function isSport(item: { title?: string; categories?: string[]; link?: string }): boolean {
  const haystack = [
    item.title ?? "",
    (item.categories ?? []).join(" "),
    item.link ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return SPORT_TERMS.some((t) => haystack.includes(t));
}

function dedupe(items: NewsItem[]): NewsItem[] {
  const byKey = new Map<string, NewsItem>();
  for (const it of items) {
    const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
    const existing = byKey.get(key);
    if (!existing || existing.publishedAt < it.publishedAt) {
      byKey.set(key, it);
    }
  }
  return [...byKey.values()];
}

export type FeedResult = { feed: string; count: number; error?: string };

async function fetchFeed(feed: Feed, category: NewsCategory): Promise<{ items: NewsItem[]; meta: FeedResult }> {
  try {
    const parsed = await parser.parseURL(feed.url);
    const rawItems = parsed.items ?? [];
    const items = rawItems
      .filter((it: { title?: string; categories?: string[]; link?: string }) =>
        !isSport({ title: it.title, categories: it.categories, link: it.link }),
      )
      .slice(0, 15)
      .map((it: Record<string, unknown>) => ({
        category,
        source: feed.name,
        title: (it.title as string | undefined)?.trim() ?? "(senza titolo)",
        link: (it.link as string | undefined) ?? "",
        publishedAt: (it.isoDate as string | undefined) ?? (it.pubDate as string | undefined) ?? new Date().toISOString(),
        summary: ((it.contentSnippet as string | undefined) ?? (it.content as string | undefined) ?? "").slice(0, 300),
        image: extractImage(it),
      }))
      .filter((it: NewsItem) => it.link) as NewsItem[];
    return { items, meta: { feed: feed.name, count: items.length } };
  } catch (err) {
    return { items: [], meta: { feed: feed.name, count: 0, error: (err as Error).message } };
  }
}

export async function fetchNews(feeds: {
  local: Feed[];
  italy: Feed[];
  global: Feed[];
}): Promise<{ local: NewsItem[]; italy: NewsItem[]; global: NewsItem[]; _meta?: FeedResult[] }> {
  // Cache key based on feed URLs only (not the full objects) to be stable
  const cacheKey = `news:v2:${[...feeds.local, ...feeds.italy, ...feeds.global].map((f) => f.url).join("|")}`;
  return cached(cacheKey, 20 * 60, async () => {
    const [localResults, italyResults, globalResults] = await Promise.all([
      Promise.all(feeds.local.map((f) => fetchFeed(f, "local"))),
      Promise.all(feeds.italy.map((f) => fetchFeed(f, "italy"))),
      Promise.all(feeds.global.map((f) => fetchFeed(f, "global"))),
    ]);

    const local = localResults.flatMap((r) => r.items);
    const italy = italyResults.flatMap((r) => r.items);
    const global = globalResults.flatMap((r) => r.items);
    const _meta = [...localResults, ...italyResults, ...globalResults].map((r) => r.meta);

    const sortByDate = (a: NewsItem, b: NewsItem) => b.publishedAt.localeCompare(a.publishedAt);
    return {
      local: dedupe(local).sort(sortByDate).slice(0, 12),
      italy: dedupe(italy).sort(sortByDate).slice(0, 12),
      global: dedupe(global).sort(sortByDate).slice(0, 12),
      _meta,
    };
  });
}
