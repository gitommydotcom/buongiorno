import type { CalEvent, Reminder } from "./caldav";
import type { Mail } from "./gmail";
import type { NewsItem } from "./news";
import type { TrafficIncident } from "./traffic";
import type { WeatherSnapshot } from "./weather";

type Lang = "it" | "en";

const SYSTEMS: Record<Lang, string> = {
  it: "Sei l'assistente personale di una persona impegnata. Parli in italiano, in modo caldo, naturale, conciso. Non sei un robot: sembri un amico premuroso che fa il punto della giornata. Non usi elenchi puntati: solo prosa scorrevole. Non usi emoji. Non ripeti dati grezzi: li interpreti. Massimo 5-7 frasi, a meno che non ti chiedano diversamente.",
  en: "You are the personal assistant of a busy person. Speak naturally and warmly, like a thoughtful friend giving them the lay of the day. Avoid bullet lists - only flowing prose. No emoji. Don't restate raw data, interpret it. Max 5-7 sentences unless asked otherwise.",
};

function withCustom(base: string, custom: string | undefined, lang: Lang): string {
  const trimmed = (custom ?? "").trim();
  if (!trimmed) return base;
  const header = lang === "it"
    ? "\n\nIstruzioni personalizzate dell'utente (priorità assoluta sulle istruzioni di default qui sopra):\n"
    : "\n\nUser's custom instructions (override the defaults above):\n";
  return base + header + trimmed;
}

function pickBase(defaultBase: string, override: string | undefined): string {
  const trimmed = (override ?? "").trim();
  return trimmed ? trimmed : defaultBase;
}

function fmtTime(iso: string, tz: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: tz });
}
function fmtDay(iso: string, tz: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: tz });
}

export function dayNarrationPrompt(input: {
  language: Lang;
  userName: string;
  now: Date;
  timezone: string;
  events: CalEvent[];
  reminders: Reminder[];
  weather: WeatherSnapshot | null;
  traffic: TrafficIncident[];
  importantMail: Mail[];
  newsHeadlines?: { source: string; title: string }[];
  customPrompt?: string;
  basePrompt?: string;
}): { system: string; user: string } {
  const { language, userName, now, timezone, events, reminders, weather, traffic, importantMail, newsHeadlines, customPrompt, basePrompt } = input;
  const locale = language === "it" ? "it-IT" : "en-US";

  const eventsLine = events.length
    ? events
        .map((e) => `- ${fmtTime(e.start, timezone, locale)}-${fmtTime(e.end, timezone, locale)} "${e.title}"${e.location ? ` @ ${e.location}` : ""} [calendario: ${e.calendar}]`)
        .join("\n")
    : "(nessun evento)";

  const overdue = reminders.filter((r) => r.due && new Date(r.due) < now);
  const dueToday = reminders.filter((r) => r.due && new Date(r.due).toDateString() === now.toDateString());
  const noDate = reminders.filter((r) => !r.due);

  const remindersLine = [
    overdue.length ? `SCADUTI (${overdue.length}): ${overdue.slice(0, 5).map((r) => `"${r.title}"`).join(", ")}` : "",
    dueToday.length ? `OGGI (${dueToday.length}): ${dueToday.slice(0, 8).map((r) => `"${r.title}"`).join(", ")}` : "",
    noDate.length ? `Senza scadenza (top 3): ${noDate.slice(0, 3).map((r) => `"${r.title}"`).join(", ")}` : "",
  ].filter(Boolean).join("\n") || "(nessun promemoria)";

  const weatherLine = weather
    ? `Adesso ${Math.round(weather.current.temp)}°C, ${weather.current.description}. Oggi min ${Math.round(weather.daily[0].tempMin)}° / max ${Math.round(weather.daily[0].tempMax)}°, prob. pioggia ${weather.daily[0].precipitationProb}%.`
    : "(meteo non disponibile)";

  const trafficLine = traffic.length
    ? `${traffic.length} eventi sulla viabilità: ${traffic.slice(0, 4).map((t) => `${t.category}${t.from ? ` (${t.from})` : ""}`).join("; ")}.`
    : "(nessuna criticità sul traffico)";

  const mailLine = importantMail.length
    ? importantMail.slice(0, 5).map((m) => `- da ${m.from}: "${m.subject}"`).join("\n")
    : "(nessuna mail importante recente)";

  const newsLine = newsHeadlines && newsHeadlines.length
    ? newsHeadlines.slice(0, 6).map((n) => `- (${n.source}) ${n.title}`).join("\n")
    : "(nessuna notizia rilevante)";

  const system = withCustom(pickBase(SYSTEMS[language], basePrompt), customPrompt, language);
  const user = `Sono ${userName}. Adesso è ${fmtDay(now.toISOString(), timezone, locale)} alle ${fmtTime(now.toISOString(), timezone, locale)}.

Eventi del calendario di oggi:
${eventsLine}

Promemoria attivi:
${remindersLine}

Meteo a ${weather?.place ?? ""}: ${weatherLine}
Traffico locale: ${trafficLine}

Mail recenti che potrebbero richiedere attenzione:
${mailLine}

Notizie del momento (locali, nazionali, globali):
${newsLine}

Considera TUTTI i dati qui sopra (calendario, promemoria, meteo, traffico, mail, notizie) e fammi un briefing personale della giornata. Apri con un saluto adatto all'orario. Idealmente:
- cosa ho davvero da fare oggi e in che ordine, segnalando sovrapposizioni o tempi stretti tra impegni in luoghi diversi;
- cosa potrebbe sfuggirmi (promemoria scaduti, mail urgenti, conflitti, meteo che impatta un evento, traffico che potrebbe rallentarmi);
- se rilevante, un cenno alle notizie del momento che potrebbero interessarmi o impattare la mia giornata;
- un consiglio pratico finale.
Prosa scorrevole, niente elenchi né bullet, niente emoji.`;

  return { system, user };
}

export function newsNarrationPrompt(input: {
  language: Lang;
  items: NewsItem[];
  customPrompt?: string;
  basePrompt?: string;
}): { system: string; user: string } {
  const top = input.items.slice(0, 8);
  const list = top
    .map((n, i) => `${i + 1}. [${n.category}] (${n.source}) ${n.title} — ${n.summary.slice(0, 200)}`)
    .join("\n");
  const defaultBase = input.language === "it"
    ? "Sei un amico curioso e informato che ti aggiorna sulle notizie del momento mentre prendi il caffè. Parli in italiano, conversazionale, intelligente, mai sensazionalista. Mai sport. Niente bullet, niente emoji. Commenti brevemente le notizie mettendo in relazione gli eventi quando ha senso. Massimo 8 frasi."
    : "You are a curious, well-informed friend giving the morning news rundown over coffee. Conversational, smart, never sensational. No sports. No bullets, no emoji. Briefly comment and connect events. Max 8 sentences.";
  const system = withCustom(pickBase(defaultBase, input.basePrompt), input.customPrompt, input.language);
  const user = `Ecco le notizie principali del momento (locali, italiane, globali):\n\n${list}\n\nFammi un riassunto narrato come se me lo stessi raccontando tu, scegliendo le 4-6 notizie davvero importanti tra queste e collegandole con un filo narrativo. Niente sport. Non riassumere notizia per notizia in modo meccanico.`;
  return { system, user };
}

export function mailSummaryPrompt(input: {
  language: Lang;
  mail: Mail[];
  customPrompt?: string;
  basePrompt?: string;
}): { system: string; user: string } {
  const lang = input.language;
  const list = input.mail.length
    ? input.mail
        .slice(0, 25)
        .map(
          (m, i) =>
            `${i + 1}. da: ${m.from} | oggetto: "${m.subject}" | snippet: ${m.snippet.slice(0, 200)} | flag: ${[
              m.unread ? "non-letta" : "",
              m.important ? "importante" : "",
              m.starred ? "stellata" : "",
            ]
              .filter(Boolean)
              .join(",") || "letta"}`,
        )
        .join("\n")
    : "(nessuna mail recente)";

  const defaultBase =
    lang === "it"
      ? "Sei un assistente che fa il punto sull'inbox in poche frasi. Italiano colloquiale, asciutto, niente emoji, niente elenchi puntati."
      : "You are an assistant who sums up the inbox in a few sentences. Plain English, no emoji, no bullet lists.";

  const system = withCustom(pickBase(defaultBase, input.basePrompt), input.customPrompt, lang);

  const user =
    lang === "it"
      ? `Ecco le ${input.mail.length} mail più recenti:

${list}

Fammi un riassunto complessivo in 3-5 frasi di prosa. Apri dicendo se c'è qualcosa di davvero urgente o se l'inbox è tranquilla, poi accenna ai temi/mittenti principali (es. "diverse newsletter da X e Y", "una richiesta da Mario su Z"), e chiudi con un'eventuale azione consigliata. Niente elenchi, niente bullet, niente intestazioni: solo prosa scorrevole.`
      : `Here are the ${input.mail.length} most recent emails:

${list}

Give me one overall summary in 3-5 sentences of prose. Open by saying whether anything is truly urgent or the inbox is quiet, then mention the main themes/senders, then close with a suggested action if any. No lists, no bullets, no headings — just flowing prose.`;

  return { system, user };
}
