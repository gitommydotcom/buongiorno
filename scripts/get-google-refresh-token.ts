/**
 * Helper one-shot per ottenere il GOOGLE_REFRESH_TOKEN.
 *
 * Uso:
 *   1. Imposta GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback in .env.local
 *   2. Avvia `npm run dev`
 *   3. Vai su http://localhost:3000/api/gmail/auth
 *   4. Completa il consenso Google
 *   5. La pagina di callback ti mostrerà il GOOGLE_REFRESH_TOKEN da salvare
 *
 * Questo script è un'alternativa CLI che apre il browser e stampa il refresh token
 * senza dover avviare il server Next.
 */
import { google } from "googleapis";
import http from "node:http";
import { URL } from "node:url";

const PORT = 4123;
const REDIRECT = `http://localhost:${PORT}/oauth/callback`;

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Imposta GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET in .env.local prima di lanciare lo script.");
    process.exit(1);
  }

  const oauth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  console.log("\nApri questo URL nel browser e autorizza:\n");
  console.log(url);
  console.log("");

  await new Promise<void>((resolve) => {
    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url ?? "", `http://localhost:${PORT}`);
      const code = u.searchParams.get("code");
      if (!code) {
        res.statusCode = 400;
        res.end("missing code");
        return;
      }
      try {
        const { tokens } = await oauth.getToken(code);
        if (tokens.refresh_token) {
          console.log("\n✓ GOOGLE_REFRESH_TOKEN ottenuto. Aggiungilo a .env.local e a Netlify:\n");
          console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
          res.end("Token ricevuto. Puoi chiudere questa scheda.");
        } else {
          console.log("\n⚠ Nessun refresh token ricevuto.");
          console.log("Revoca l'accesso su https://myaccount.google.com/permissions e ripeti.");
          res.end("Nessun refresh token. Revoca l'accesso e riprova.");
        }
      } catch (e) {
        console.error("Errore:", e);
        res.statusCode = 500;
        res.end("error");
      }
      server.close();
      resolve();
    });
    server.listen(PORT);
  });
}

main();
