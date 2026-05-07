"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Settings, Feed } from "@/lib/settings";
import { Trash2, Plus, MapPin, Globe, Rss, Check, Sparkles, RotateCcw, AlertTriangle } from "lucide-react";

type GeocodeResult = { name: string; country: string; admin1?: string; lat: number; lon: number; timezone: string };

export function SettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const sRef = useRef(s);
  useEffect(() => {
    sRef.current = s;
  }, [s]);

  // debounce geocode
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setGeoLoading(true);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const d = await res.json();
      setResults(d.results ?? []);
      setGeoLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Optimistic update: write state immediately, then PUT. Avoids stale-closure
  // races when the user mutates settings rapidly (e.g. add two feeds in a row).
  async function commit(updater: (prev: Settings) => Settings) {
    const next = updater(sRef.current);
    sRef.current = next;
    setS(next);
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Errore ${res.status}`);
      }
      setSavedAt(Date.now());
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function pickPlace(g: GeocodeResult) {
    commit((prev) => ({
      ...prev,
      location: {
        name: [g.name, g.admin1, g.country].filter(Boolean).join(", "),
        lat: g.lat,
        lon: g.lon,
        timezone: g.timezone,
      },
    }));
    setQuery("");
    setResults([]);
  }

  function setLanguage(lang: "it" | "en") {
    commit((prev) => ({ ...prev, language: lang }));
  }

  function addFeed(category: "local" | "italy" | "global", feed: Feed) {
    commit((prev) => ({
      ...prev,
      feeds: { ...prev.feeds, [category]: [...prev.feeds[category], feed] },
    }));
  }
  function removeFeed(category: "local" | "italy" | "global", url: string) {
    commit((prev) => ({
      ...prev,
      feeds: {
        ...prev.feeds,
        [category]: prev.feeds[category].filter((f) => f.url !== url),
      },
    }));
  }

  const justSaved = useMemo(() => savedAt && Date.now() - savedAt < 2000, [savedAt]);

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <MapPin size={16} className="text-accent" />
          Luogo
        </div>
        <div className="text-sm text-muted">Attuale: <span className="font-medium text-fg">{s.location.name}</span></div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca una città… (anche se sei in viaggio)"
          className="mt-3 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {geoLoading && <p className="mt-2 text-xs text-muted">Cerco…</p>}
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
            {results.map((g) => (
              <li key={`${g.lat}-${g.lon}`}>
                <button
                  onClick={() => pickPlace(g)}
                  className="tap flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg"
                >
                  <span>{g.name}{g.admin1 ? `, ${g.admin1}` : ""}</span>
                  <span className="text-xs text-muted">{g.country}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Globe size={16} className="text-accent" />
          Lingua narrazione AI
        </div>
        <div className="flex gap-2">
          {(["it", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`tap rounded-full px-4 py-2 text-sm ${s.language === l ? "bg-fg text-bg" : "bg-bg text-muted"}`}
            >
              {l === "it" ? "Italiano" : "English"}
            </button>
          ))}
        </div>
      </div>

      <PromptEditor
        prompts={s.aiPrompts}
        onSave={(prompts) => commit((prev) => ({ ...prev, aiPrompts: prompts }))}
      />

      <FeedsEditor
        title="Notizie locali"
        category="local"
        feeds={s.feeds.local}
        onAdd={(f) => addFeed("local", f)}
        onRemove={(url) => removeFeed("local", url)}
      />
      <FeedsEditor
        title="Notizie Italia"
        category="italy"
        feeds={s.feeds.italy}
        onAdd={(f) => addFeed("italy", f)}
        onRemove={(url) => removeFeed("italy", url)}
      />
      <FeedsEditor
        title="Notizie globali"
        category="global"
        feeds={s.feeds.global}
        onAdd={(f) => addFeed("global", f)}
        onRemove={(url) => removeFeed("global", url)}
      />

      <p className="text-xs text-muted">
        Le notizie sportive vengono filtrate automaticamente da titoli, categorie e URL.
      </p>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
        {saveError ? (
          <div className="pointer-events-auto flex max-w-full items-start gap-2 rounded-2xl bg-danger/95 px-4 py-2 text-xs text-bg shadow-lg">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span className="break-words">Errore: {saveError}</span>
            <button
              onClick={() => setSaveError(null)}
              className="ml-2 rounded-full bg-bg/15 px-2 py-0.5 text-[11px]"
            >
              chiudi
            </button>
          </div>
        ) : (saving || justSaved) ? (
          <div className="flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-xs text-bg shadow-lg">
            {saving ? "Salvo…" : (
              <>
                <Check size={12} /> salvato
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FeedsEditor({
  title,
  category,
  feeds,
  onAdd,
  onRemove,
}: {
  title: string;
  category: string;
  feeds: Feed[];
  onAdd: (f: Feed) => void;
  onRemove: (url: string) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  function add() {
    setUrlError(null);
    if (!name.trim() || !url.trim()) {
      setUrlError("Compila nome e URL");
      return;
    }
    try {
      const u = new URL(url.trim());
      if (!/^https?:$/.test(u.protocol)) throw new Error("URL non valido");
    } catch {
      setUrlError("URL non valido");
      return;
    }
    onAdd({ name: name.trim(), url: url.trim() });
    setName("");
    setUrl("");
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Rss size={16} className="text-accent" />
        {title}
      </div>
      <ul className="mb-3 space-y-1.5">
        {feeds.map((f) => (
          <li key={f.url} className="flex items-center gap-2 rounded-lg bg-bg px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{f.name}</div>
              <div className="truncate text-xs text-muted">{f.url}</div>
            </div>
            <button
              onClick={() => onRemove(f.url)}
              className="tap shrink-0 rounded-full p-2 text-muted hover:text-danger"
              aria-label="Rimuovi"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {feeds.length === 0 && <li className="text-xs text-muted">Nessun feed in questa categoria.</li>}
      </ul>
      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Nome (es. ANSA ${category})`}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… (URL del feed RSS)"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={add}
            className="tap inline-flex items-center gap-1 rounded-lg bg-fg px-3 text-sm text-bg"
          >
            <Plus size={14} /> aggiungi
          </button>
        </div>
        {urlError && <p className="text-xs text-danger">{urlError}</p>}
      </div>
    </div>
  );
}

const ADD_HINTS = {
  day: `Esempi:
- "Sii diretto, niente convenevoli."
- "Apri sempre con la cosa più importante."
- "Considera che alle 9 mi alleno: tienine conto."`,
  week: `Esempi:
- "Evidenzia i giorni più carichi e quelli più liberi."
- "Quando vedi un viaggio, suggerisci cosa preparare."`,
  news: `Esempi:
- "Privilegia politica/economia, niente cronaca nera."
- "Massimo 3 notizie."
- "Tono ironico e curioso."`,
  mail: `Esempi:
- "Considera urgente solo ciò che richiede risposta entro oggi."
- "Tratta le mail di lavoro come prioritarie rispetto alle personali."`,
};

const BASE_HINTS = {
  day:
    'Sostituisci interamente le istruzioni di sistema. Esempio: "Sei un capo di stato maggiore. Frasi brevi, stile militare. Massimo 4 frasi, niente convenevoli."',
  week:
    'Sostituisci interamente le istruzioni per la settimana. Esempio: "Parla come un coach. Sguardo strategico, tono motivante."',
  news:
    'Sostituisci le istruzioni del riassunto news. Esempio: "Sei un analista geopolitico. Tono asciutto, contestualizza ogni notizia con un dato."',
  mail:
    'Sostituisci le istruzioni del riassunto mail. Esempio: "Sei una segretaria pignola. Restituisci solo il formato Markdown richiesto."',
};

type PromptKey = "day" | "week" | "news" | "mail";

const PROMPT_LABELS: Record<PromptKey, string> = {
  day: "Giornata",
  week: "Settimana",
  news: "News",
  mail: "Mail",
};

type PromptsState = {
  day: string;
  week: string;
  news: string;
  mail: string;
  baseDay: string;
  baseWeek: string;
  baseNews: string;
  baseMail: string;
};

function PromptEditor({
  prompts,
  onSave,
}: {
  prompts: PromptsState;
  onSave: (p: PromptsState) => void;
}) {
  const [local, setLocal] = useState<PromptsState>(prompts);
  const [tab, setTab] = useState<PromptKey>("day");
  const [mode, setMode] = useState<"add" | "base">("add");

  useEffect(() => setLocal(prompts), [prompts]);

  const baseKey = ("base" + tab[0].toUpperCase() + tab.slice(1)) as keyof PromptsState;
  const addKey = tab as keyof PromptsState;
  const activeKey = mode === "base" ? baseKey : addKey;
  const value = local[activeKey];

  function setValue(v: string) {
    setLocal((prev) => ({ ...prev, [activeKey]: v }));
  }

  const dirty = (Object.keys(local) as (keyof PromptsState)[]).some((k) => local[k] !== prompts[k]);

  function applyAll() {
    onSave({
      day: local.day.trim(),
      week: local.week.trim(),
      news: local.news.trim(),
      mail: local.mail.trim(),
      baseDay: local.baseDay.trim(),
      baseWeek: local.baseWeek.trim(),
      baseNews: local.baseNews.trim(),
      baseMail: local.baseMail.trim(),
    });
  }

  function clearActive() {
    setValue("");
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={16} className="text-accent" />
        Istruzioni per l&apos;AI
      </div>
      <p className="mb-3 text-xs text-muted">
        Personalizza come l&apos;AI ti racconta giornata, settimana, news e mail.
        L&apos;AI continua a vedere tutti i tuoi dati: cambi solo tono, focus e formato.
      </p>

      <div className="-mx-1 mb-3 flex flex-wrap gap-1">
        {(Object.keys(PROMPT_LABELS) as PromptKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === t ? "bg-fg text-bg" : "bg-bg text-muted"
            }`}
          >
            {PROMPT_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="mb-3 inline-flex rounded-full border border-border bg-bg p-0.5 text-xs">
        <button
          onClick={() => setMode("add")}
          className={`tap rounded-full px-3 py-1 ${mode === "add" ? "bg-fg text-bg" : "text-muted"}`}
        >
          aggiungi istruzioni
        </button>
        <button
          onClick={() => setMode("base")}
          className={`tap rounded-full px-3 py-1 ${mode === "base" ? "bg-fg text-bg" : "text-muted"}`}
        >
          prompt di base
        </button>
      </div>

      <p className="mb-2 text-[11px] text-muted">
        {mode === "add"
          ? "Le tue istruzioni vengono aggiunte al prompt di default e hanno priorità."
          : "Sostituisci interamente il prompt di sistema di default. Lascia vuoto per usare il default."}
      </p>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={mode === "base" ? 8 : 6}
        placeholder={
          mode === "base"
            ? `Prompt di base per la sezione "${PROMPT_LABELS[tab]}"…`
            : `Istruzioni aggiuntive per la sezione "${PROMPT_LABELS[tab]}"…`
        }
        className="w-full resize-none rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted">vedi esempi</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-bg p-2 text-xs text-muted">
          {mode === "base" ? BASE_HINTS[tab] : ADD_HINTS[tab]}
        </pre>
      </details>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={applyAll}
          disabled={!dirty}
          className="tap inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-fg px-3 py-2 text-sm text-bg disabled:opacity-40"
        >
          <Check size={14} /> {dirty ? "Salva istruzioni" : "Nessuna modifica"}
        </button>
        <button
          onClick={clearActive}
          className="tap inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-fg"
          aria-label="Svuota"
        >
          <RotateCcw size={14} /> svuota
        </button>
      </div>
    </div>
  );
}
