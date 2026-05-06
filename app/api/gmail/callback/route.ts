import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/gmail";

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
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Token ricevuto</title><style>body{font-family:system-ui;padding:2rem;max-width:640px;margin:auto;line-height:1.6}code{background:#f0eee8;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.85rem;word-break:break-all}</style></head><body><h1>Token ricevuto</h1><p>Aggiungi questa variabile alle tue env (locali su <code>.env.local</code>, in produzione su Netlify):</p><pre><code>GOOGLE_REFRESH_TOKEN=${refresh}</code></pre><p>Poi riavvia il server. Dopo questo, l'app può leggere Gmail in modo autonomo.</p></body></html>`;
    return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
