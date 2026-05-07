import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, saveRefreshToken } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });
  try {
    const tokens = await exchangeCode(code);
    const refresh = tokens.refresh_token;
    if (!refresh) {
      return NextResponse.json(
        { error: "Nessun refresh token ricevuto. Revoca l'accesso su https://myaccount.google.com/permissions e riprova." },
        { status: 400 },
      );
    }

    // Save automatically so it persists across deploys without adding an env var
    await saveRefreshToken(refresh);

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Gmail collegato</title><style>body{font-family:system-ui;padding:2rem;max-width:640px;margin:auto;line-height:1.6;background:#faf8f4}h1{color:#1c1a18}.ok{color:#2a7a4a;font-weight:600}code{background:#f0eee8;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.85rem;word-break:break-all}a{color:#c46e3c}</style></head><body><h1>✓ Gmail collegato</h1><p class="ok">Il token è stato salvato automaticamente. Puoi tornare all'app.</p><p><a href="/">← Torna alla home</a></p><hr/><p style="font-size:0.8rem;color:#888">Se vuoi anche aggiungere il token come variabile d'ambiente (ridondanza):<br/><code>GOOGLE_REFRESH_TOKEN=${refresh}</code></p></body></html>`;
    return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
