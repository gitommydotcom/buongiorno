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

const parser: Parser<unknown, { "media:content"?: { $?: { url?: string } }; "media:thumbnail"?: { $?: { url?: string } }; image?: string }> = new Parser({
  timeout: 8000,
  headers: { "User-Agent": "Mozilla/5.0 BuongiornoBot/1.0" },
  customFields: {
    item: [
      ["media:content", "media:content", { keepArray: false }],
      ["media:thumbnail", "media:thumbnail", { keepArray: false }],
      ["enclosure", "enclosure"],
      ["image", "image"],
    ],
  },
});

function extractImage(item: Record<string, unknown>): string | undefined {
  const enc = item.enclosure as { url?: string; type?: string } | undefined;
  if (enc?.url && (!enc.type || enc.type.startsWith("image"))) return enc.url;
  const mc = item["media:content"] as { $?: { url?: string }; url?: string } | undefined;
  if (mc?.$?.url) return mc.$.url;
  if (typeof mc === "object" && mc && "url" in mc && typeof mc.url === "string") return mc.url;
  const mt = item["media:thumbnail"] as { $?: { url?: string }; url?: string } | undefined;
  if (mt?.$?.url) return mt.$.url;
  if (typeof mt === "object" && mt && "url" in mt && typeof mt.url === "string") return mt.url;
  if (typeof item.image === "string") return item.image;
  const html = (item["content:encoded"] as string | undefined) ?? (item.content as string | undefined) ?? "";
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1];
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

async function fetchFeed(feed: Feed, category: NewsCategory): Promise<NewsItem[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    const items = parsed.items ?? [];
    return items
      .filter((it) => !isSport({ title: it.title, categories: it.categories, link: it.link }))
      .slice(0, 15)
      .map<NewsItem>((it) => ({
        category,
        source: feed.name,
        title: it.title?.trim() ?? "(senza titolo)",
        link: it.link ?? "",
        publishedAt: it.isoDate ?? it.pubDate ?? new Date().toISOString(),
        summary: (it.contentSnippet ?? it.content ?? "").slice(0, 300),
        image: extractImage(it as unknown as Record<string, unknown>),
      }))
      .filter((it) => it.link);
  } catch {
    return [];
  }
}

export async function fetchNews(feeds: {
  local: Feed[];
  italy: Feed[];
  global: Feed[];
}): Promise<{ local: NewsItem[]; italy: NewsItem[]; global: NewsItem[] }> {
  const cacheKey = `news:${JSON.stringify(feeds)}`;
  return cached(cacheKey, 30 * 60, async () => {
    const [local, italy, global] = await Promise.all([
      Promise.all(feeds.local.map((f) => fetchFeed(f, "local"))).then((arrs) => arrs.flat()),
      Promise.all(feeds.italy.map((f) => fetchFeed(f, "italy"))).then((arrs) => arrs.flat()),
      Promise.all(feeds.global.map((f) => fetchFeed(f, "global"))).then((arrs) => arrs.flat()),
    ]);
    const sortByDate = (a: NewsItem, b: NewsItem) => b.publishedAt.localeCompare(a.publishedAt);
    return {
      local: dedupe(local).sort(sortByDate).slice(0, 12),
      italy: dedupe(italy).sort(sortByDate).slice(0, 12),
      global: dedupe(global).sort(sortByDate).slice(0, 12),
    };
  });
}
