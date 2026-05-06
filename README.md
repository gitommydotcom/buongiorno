# Buongiorno

Dashboard quotidiana personale che unisce **Apple Calendar**, **Apple Promemoria**, **Gmail**, **meteo**, **traffico** e **notizie** in una sola schermata, con narrazione AI della giornata. Mobile-first, installabile come app dalla home dell'iPhone.

- **Focus principale:** la giornata di oggi (timeline, meteo, mail, news, traffico)
- **Focus secondario:** la settimana in arrivo
- **Privata:** single-user, dietro password, deployata sul tuo Netlify
- **AI:** Groq (Llama 3.3 70B), gratis
- **Niente sport:** mai, in nessuna sezione news

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Netlify Blobs (per le impostazioni) · Groq · CalDAV via `tsdav` · Google OAuth + Gmail API · RSS · Open-Meteo · TomTom

---

## Setup passo-passo

### 1. Clona e installa

```bash
git clone <repo>
cd buongiorno
npm install
cp .env.example .env.local
```

### 2. Apple Calendar e Promemoria

L'integrazione usa CalDAV su `caldav.icloud.com`.

1. Vai su https://appleid.apple.com → "Accesso e sicurezza" → "Password specifiche per app" → genera una nuova password (es. nome "Buongiorno").
2. In `.env.local`:
   ```
   ICLOUD_USERNAME=tuoindirizzo@icloud.com
   ICLOUD_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

L'app legge **tutti** i tuoi calendari (anche "Compleanni") e **tutte** le liste di Promemoria.

### 3. Gmail (OAuth)

1. Vai su https://console.cloud.google.com → crea un progetto.
2. **API & Services** → **Library** → abilita **Gmail API**.
3. **OAuth consent screen** → External → riempi i campi base, scope `https://www.googleapis.com/auth/gmail.readonly`. Aggiungi il tuo indirizzo come "Test user" (così resti in modalità Testing senza dover passare la verifica Google).
4. **Credentials** → Create credentials → OAuth client ID → Web application:
   - Authorized redirect URI: `http://localhost:3000/api/gmail/callback` (e in produzione `https://tuo-dominio.netlify.app/api/gmail/callback`).
5. Salva Client ID e Secret in `.env.local`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
   ```
6. Ottieni il refresh token (una volta sola):
   ```bash
   npm run dev
   # poi apri http://localhost:3000/api/gmail/auth nel browser
   ```
   Dopo il consenso, la pagina ti mostrerà il `GOOGLE_REFRESH_TOKEN` da copiare in `.env.local`.

### 4. Groq (AI)

1. Vai su https://console.groq.com/keys → crea un'API key.
2. ```
   GROQ_API_KEY=gsk_...
   ```

### 5. TomTom (traffico)

1. https://developer.tomtom.com → registrati → crea una chiave (free tier 2500 req/giorno).
2. ```
   TOMTOM_API_KEY=...
   ```

### 6. Resto delle env

```
APP_PASSWORD=qualcosa-di-lungo-e-segreto
USER_NAME=Tommaso
DEFAULT_LAT=42.3498
DEFAULT_LON=13.3995
DEFAULT_PLACE_NAME=L'Aquila
DEFAULT_LANGUAGE=it
```

Il luogo, la lingua e i feed RSS sono solo i **default iniziali**: una volta avviata l'app, modifica tutto da `/impostazioni` (vengono salvati su Netlify Blobs in produzione, su `.data/settings.json` in locale).

### 7. Avvio

```bash
npm run dev
# http://localhost:3000  → password = APP_PASSWORD
```

---

## Deploy su Netlify

1. Crea un nuovo sito Netlify collegato a questo repo (branch `claude/daily-updates-dashboard-4BWHi` o `main`).
2. Netlify rileva Next.js automaticamente (`netlify.toml` già incluso).
3. **Site configuration → Environment variables** → incolla **tutte** le variabili sopra. Per `GOOGLE_REDIRECT_URI` usa l'URL di produzione, ad es. `https://buongiorno.netlify.app/api/gmail/callback`, e aggiungilo come "Authorized redirect URI" anche in Google Cloud Console.
4. **Deploy.**
5. Apri il sito sul tuo iPhone in Safari → Condividi → "Aggiungi alla schermata Home". L'app si comporterà come un'app nativa.

---

## Aggiungere/togliere feed RSS

Da `/impostazioni`. Tre categorie: **Locali**, **Italia**, **Globali**. Niente sport (filtro server-side su titoli, categorie e URL).

Default forniti:
- **Locali Abruzzo:** Il Centro, Virtù Quotidiane, Rete8
- **Italia:** ANSA, Repubblica, Corriere, Il Post, Il Sole 24 Ore
- **Globali:** BBC, Reuters, Al Jazeera, Le Monde

---

## Architettura veloce

- `app/page.tsx` — pagina Oggi (focus principale)
- `app/settimana/page.tsx` — focus secondario
- `app/impostazioni/page.tsx` — luogo, lingua, RSS
- `app/api/*` — route server-side (CalDAV, Gmail, news, meteo, traffico, AI)
- `lib/*` — client per ogni integrazione, cache LRU in-memory, prompts AI

L'AI viene chiamata **server-side**: aggrega gli stati di calendar, promemoria, meteo, traffico, mail e produce una narrazione in prosa. La risposta è cachata 10 min e riusata finché i dati sottostanti non cambiano.

Se vuoi cambiare il tono, edita `lib/prompts.ts`.

---

## Privacy

- Tutti i dati restano nel tuo Netlify privato + Google + iCloud.
- Le credenziali vivono solo come env vars (mai esposte al browser).
- L'AI riceve solo i metadati strettamente necessari (titolo evento, mittente mail, snippet) — mai contenuto completo dei messaggi.
- Sito protetto da basic-auth via cookie.
