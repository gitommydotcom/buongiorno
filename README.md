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

> Nota: Google Cloud Console nel 2025 ha riorganizzato la sezione "OAuth consent screen" sotto un nuovo menu chiamato **Google Auth Platform** (con sotto-pagine *Overview*, *Branding*, *Audience*, *Clients*, *Data Access*, *Verification*). I passi sotto rispecchiano questa UI.

#### 3.1 — Crea un progetto

1. Vai su <https://console.cloud.google.com>.
2. In alto a sinistra, accanto al logo "Google Cloud", clicca sul **selettore progetto** → **NEW PROJECT** → dai un nome (es. `Buongiorno`) → **CREATE**.
3. Aspetta qualche secondo che il progetto si crei e poi **selezionalo** nello stesso selettore.

#### 3.2 — Abilita l'API Gmail

1. Menu ☰ in alto a sinistra → **APIs & Services** → **Library**.
2. Nella search bar scrivi **`Gmail API`** → click sul risultato → bottone **ENABLE**.

#### 3.3 — Configura "Google Auth Platform"

1. Menu ☰ → **APIs & Services** → **OAuth consent screen** (o, se la vedi, direttamente **Google Auth Platform**).
2. Se è il primo accesso, clicca **GET STARTED** e compila:
   - **App name**: `Buongiorno`
   - **User support email**: il tuo indirizzo Gmail
   - **Audience**: scegli **External** (è normale, vale anche per app personali)
   - **Contact information**: il tuo indirizzo Gmail
   - Accetta i termini → **CREATE**
3. Una volta creata la "Auth Platform", **resta in modalità Testing**: così non devi passare la verifica Google e l'app funziona per gli utenti che aggiungi tu (te stesso).
4. Nel menu laterale di Google Auth Platform clicca **Audience**:
   - Sotto **Test users** click **+ ADD USERS** → inserisci il tuo Gmail → **SAVE**.
5. Sempre nel menu laterale, clicca **Data Access**:
   - **+ ADD OR REMOVE SCOPES**.
   - Nella tabella, in fondo, c'è un campo **Manually add scopes**. Incolla:
     `https://www.googleapis.com/auth/gmail.readonly`
   - Clicca **ADD TO TABLE**, poi spunta la checkbox accanto allo scope appena aggiunto, poi **UPDATE** in basso, infine **SAVE**.

#### 3.4 — Crea le credenziali OAuth (Client ID e Secret)

1. Menu laterale di Google Auth Platform → **Clients** (oppure menu ☰ → **APIs & Services** → **Credentials**).
2. **+ CREATE CLIENT** (oppure **+ CREATE CREDENTIALS** → **OAuth client ID**).
3. **Application type**: `Web application`.
4. **Name**: `Buongiorno`.
5. **Authorized redirect URIs** → **+ ADD URI**:
   - In sviluppo: `http://localhost:3000/api/gmail/callback`
   - In produzione (dopo aver fatto il deploy Netlify, ricorda di tornare qui ad aggiungere): `https://TUO-SITO.netlify.app/api/gmail/callback`
6. **CREATE**.
7. Si apre un popup con **Client ID** e **Client secret** — copiali entrambi.

#### 3.5 — Compila `.env.local`

```
GOOGLE_CLIENT_ID=<incolla-il-Client-ID>
GOOGLE_CLIENT_SECRET=<incolla-il-Client-Secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

#### 3.6 — Ottieni il `GOOGLE_REFRESH_TOKEN` (una volta sola)

1. Avvia il server in locale:
   ```bash
   npm run dev
   ```
2. Apri **<http://localhost:3000/api/gmail/auth>** nel browser.
3. Google ti mostra una schermata "Google hasn't verified this app" — clicca **Advanced** → **Go to Buongiorno (unsafe)** (è normale, l'app è in modalità Testing tua).
4. Spunta lo scope `gmail.readonly` → **Continue**.
5. Vieni reindirizzato a una pagina con scritto **"Token ricevuto"** e una variabile `GOOGLE_REFRESH_TOKEN=...`. **Copiala**.
6. Aggiungi a `.env.local`:
   ```
   GOOGLE_REFRESH_TOKEN=<incolla-qui>
   ```
7. Ferma e riavvia `npm run dev`. Da questo momento l'app legge la inbox da sola.

> Se non vedi il refresh token: vai su <https://myaccount.google.com/permissions>, trova "Buongiorno" → **Remove access** → riprova dal punto 2 (Google emette il refresh token solo al primo consenso).
>
> In produzione su Netlify: aggiungi `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI=https://TUO-SITO.netlify.app/api/gmail/callback` alle env vars del sito, e ricorda di aver aggiunto lo stesso URL alla lista "Authorized redirect URIs" del passo 3.4.

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
- `app/impostazioni/page.tsx` — luogo, lingua, RSS, **istruzioni AI personalizzate**
- `app/api/*` — route server-side (CalDAV, Gmail, news, meteo, traffico, AI)
- `lib/*` — client per ogni integrazione, cache LRU in-memory, prompts AI

L'AI viene chiamata **server-side** e riceve **tutti** i tuoi dati (calendario, promemoria, meteo, traffico, mail importanti, titoli delle notizie del momento) per produrre la narrazione della giornata. Stessa cosa per la settimana.

### Personalizzare il prompt AI

In `/impostazioni` → **"Istruzioni per l'AI"** puoi aggiungere indicazioni libere a tre prompt distinti:

- **Giornata** (briefing della pagina Oggi)
- **Settimana** (sintesi pagina Settimana)
- **News** (riassunto narrato delle notizie)

Le tue istruzioni vengono **integrate** alle istruzioni di default e hanno priorità (es. "sii diretto, niente convenevoli", "considera che alle 9 mi alleno", "tono ironico", "massimo 3 frasi"). L'AI continua a vedere tutti i tuoi dati: il prompt personalizzato cambia solo il tono e il focus, non quello che l'AI sa di te.

Per cambiare il prompt **base** (non solo aggiungere istruzioni), edita `lib/prompts.ts`.

---

## Privacy

- Tutti i dati restano nel tuo Netlify privato + Google + iCloud.
- Le credenziali vivono solo come env vars (mai esposte al browser).
- L'AI riceve solo i metadati strettamente necessari (titolo evento, mittente mail, snippet) — mai contenuto completo dei messaggi.
- Sito protetto da basic-auth via cookie.
