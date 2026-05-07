import { google } from "googleapis";
import { getStore } from "@netlify/blobs";
import { cached } from "./cache";

export type Mail = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  important: boolean;
  starred: boolean;
  labels: string[];
};

function envClean(name: string): string | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  return v.trim().replace(/^['"]|['"]$/g, "");
}

function isNetlify() {
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);
}

async function loadRefreshToken(): Promise<string | undefined> {
  // 1. Env var (fastest, works everywhere)
  const fromEnv = envClean("GOOGLE_REFRESH_TOKEN");
  if (fromEnv) return fromEnv;
  // 2. Netlify Blobs (saved automatically after OAuth callback)
  if (isNetlify()) {
    try {
      const store = getStore({ name: "buongiorno", consistency: "strong" });
      const t = await store.get("gmail-refresh-token");
      if (t) return t;
    } catch {
      // ignore
    }
  }
  return undefined;
}

export async function saveRefreshToken(token: string): Promise<void> {
  if (isNetlify()) {
    const store = getStore({ name: "buongiorno", consistency: "strong" });
    await store.set("gmail-refresh-token", token);
  }
  // On local dev the user adds it to .env.local manually
}

export function buildOAuthClient() {
  const clientId = envClean("GOOGLE_CLIENT_ID");
  const clientSecret = envClean("GOOGLE_CLIENT_SECRET");
  const redirectUri = envClean("GOOGLE_REDIRECT_URI");
  const missing = [
    !clientId && "GOOGLE_CLIENT_ID",
    !clientSecret && "GOOGLE_CLIENT_SECRET",
    !redirectUri && "GOOGLE_REDIRECT_URI",
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`Variabili mancanti: ${missing.join(", ")}`);
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function gmailClient() {
  const oauth = buildOAuthClient();
  const refreshToken = await loadRefreshToken();
  if (!refreshToken) {
    throw new Error("Gmail non collegato. Vai su /api/gmail/auth per completare l'OAuth.");
  }
  oauth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth });
}

function header(headers: { name?: string | null; value?: string | null }[] | undefined, name: string) {
  if (!headers) return "";
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

export async function fetchInbox(limit = 20): Promise<Mail[]> {
  return cached(`gmail:inbox:${limit}`, 5 * 60, async () => {
    const gmail = await gmailClient();
    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: limit,
      q: "in:inbox -category:promotions -category:social newer_than:7d",
    });
    const messages = list.data.messages ?? [];
    const detailed = await Promise.all(
      messages.map((m) =>
        gmail.users.messages.get({
          userId: "me",
          id: m.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        }),
      ),
    );
    return detailed.map(({ data }) => {
      const labels = data.labelIds ?? [];
      return {
        id: data.id!,
        threadId: data.threadId!,
        from: header(data.payload?.headers ?? undefined, "From"),
        subject: header(data.payload?.headers ?? undefined, "Subject") || "(senza oggetto)",
        snippet: data.snippet ?? "",
        date: header(data.payload?.headers ?? undefined, "Date"),
        unread: labels.includes("UNREAD"),
        important: labels.includes("IMPORTANT"),
        starred: labels.includes("STARRED"),
        labels,
      };
    });
  });
}

export function authorizationUrl() {
  const oauth = buildOAuthClient();
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
}

export async function exchangeCode(code: string) {
  const oauth = buildOAuthClient();
  const { tokens } = await oauth.getToken(code);
  return tokens;
}
