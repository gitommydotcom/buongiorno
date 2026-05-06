import { google } from "googleapis";
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

export function buildOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI mancanti");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function gmailClient() {
  const oauth = buildOAuthClient();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("GOOGLE_REFRESH_TOKEN non configurato. Esegui `npm run google-token`.");
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
    const gmail = gmailClient();
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
