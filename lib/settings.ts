import { getStore } from "@netlify/blobs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

const FeedSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1),
});

export const SettingsSchema = z.object({
  language: z.enum(["it", "en"]),
  location: z.object({
    name: z.string(),
    lat: z.number(),
    lon: z.number(),
    timezone: z.string().default("Europe/Rome"),
  }),
  feeds: z.object({
    local: z.array(FeedSchema),
    italy: z.array(FeedSchema),
    global: z.array(FeedSchema),
  }),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type Feed = z.infer<typeof FeedSchema>;

const KEY = "user-settings.json";
const LOCAL_PATH = path.join(process.cwd(), ".data", "settings.json");

const DEFAULT_SETTINGS: Settings = {
  language: (process.env.DEFAULT_LANGUAGE as "it" | "en") || "it",
  location: {
    name: process.env.DEFAULT_PLACE_NAME || "L'Aquila",
    lat: Number(process.env.DEFAULT_LAT || 42.3498),
    lon: Number(process.env.DEFAULT_LON || 13.3995),
    timezone: "Europe/Rome",
  },
  feeds: {
    local: [
      { name: "Il Centro", url: "https://www.ilcentro.it/rss/home.xml" },
      { name: "Virtù Quotidiane", url: "https://www.virtuquotidiane.it/feed" },
      { name: "Rete8", url: "https://www.rete8.it/feed/" },
    ],
    italy: [
      { name: "ANSA Top", url: "https://www.ansa.it/sito/ansait_rss.xml" },
      { name: "Repubblica Home", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml" },
      { name: "Corriere Home", url: "https://xml2.corriereobjects.it/rss/homepage.xml" },
      { name: "Il Post", url: "https://www.ilpost.it/feed/" },
      { name: "Il Sole 24 Ore", url: "https://www.ilsole24ore.com/rss/italia.xml" },
    ],
    global: [
      { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
      { name: "Reuters World", url: "https://feeds.reuters.com/Reuters/worldNews" },
      { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
      { name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" },
    ],
  },
};

function isNetlify() {
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);
}

async function readLocal(): Promise<Settings | null> {
  try {
    const raw = await fs.readFile(LOCAL_PATH, "utf8");
    return SettingsSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeLocal(s: Settings): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, JSON.stringify(s, null, 2), "utf8");
}

export async function getSettings(): Promise<Settings> {
  if (isNetlify()) {
    try {
      const store = getStore({ name: "buongiorno", consistency: "strong" });
      const raw = await store.get(KEY);
      if (raw) return SettingsSchema.parse(JSON.parse(raw));
    } catch {
      // fall through to defaults
    }
  } else {
    const local = await readLocal();
    if (local) return local;
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(input: unknown): Promise<Settings> {
  const parsed = SettingsSchema.parse(input);
  if (isNetlify()) {
    const store = getStore({ name: "buongiorno", consistency: "strong" });
    await store.set(KEY, JSON.stringify(parsed));
  } else {
    await writeLocal(parsed);
  }
  return parsed;
}

export { DEFAULT_SETTINGS };
