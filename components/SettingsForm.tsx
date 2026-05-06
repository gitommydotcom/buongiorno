"use client";
import { useEffect, useMemo, useState } from "react";
import type { Settings, Feed } from "@/lib/settings";
import { Trash2, Plus, MapPin, Globe, Rss, Check, Sparkles, RotateCcw } from "lucide-react";

type GeocodeResult = { name: string; country: string; admin1?: string; lat: number; lon: number; timezone: string };

export function SettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

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

  async function save(next: Settings) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setSavedAt(Date.now());
        setS(next);
      }
    } finally {
      setSaving(false);
    }
  }

  function pickPlace(g: GeocodeResult) {
    const next: Settings = {
      ...s,
      location: {
        name: [g.name, g.admin1, g.country].filter(Boolean).join(", "),
        lat: g.lat,
        lon: g.lon,
        timezone: g.timezone,
      },
    };
    save(next);
    setQuery("");
    setResults([]);
  }

  function setLanguage(lang: "it" | "en") {
    save({ ...s, language: lang });
  }

  function addFeed(category: "local" | "italy" | "global", feed: Feed) {
    save({ ...s, feeds: { ...s.feeds, [category]: [...s.feeds[category], feed] } });
  }
  function removeFeed(category: "local" | "italy" | "global", url: string) {
    save({ ...s, feeds: { ...s.feeds, [category]: s.feeds[category].filter((f) => f.url !== url) } });
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
        currentDay={s.aiPrompts.day}
        currentWeek={s.aiPrompts.week}
        currentNews={s.aiPrompts.news}
        onSave={(prompts) => save({ ...s, aiPrompts: prompts })}
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

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2">
        {(saving || justSaved) && (
          <div className="flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-xs text-bg shadow-lg">
            {saving ? "Salvo…" : (
              <>
                <Check size={12} /> salvato
              </>
            )}
          </div>
        )}
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

  function add() {
    if (!name.trim() || !url.trim()) return;
    try {
      new URL(url);
    } catch {
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
      </div>
    </div>
  );
}

const PROMPT_HINTS = {
  day: `Esempi:
- "Sii diretto, niente convenevoli."
- "Apri sempre con la cosa più importante."
- "Suggerisci un ordine concreto delle attività con orari."
- "Considera che alle 9 mi alleno: tienine conto."
- "Includi sempre un'osservazione sul meteo se incide sui miei impegni."`,
  week: `Esempi:
- "Evidenzia i giorni più carichi e quelli più liberi."
- "Quando vedi un viaggio, suggerisci cosa preparare in anticipo."
- "Mantieni un tono motivante."`,
  news: `Esempi:
- "Privilegia notizie politica/economia, niente cronaca nera."
- "Spiega il contesto, non solo i fatti."
- "Massimo 3 notizie."
- "Tono ironico e curioso."`,
};

function PromptEditor({
  currentDay,
  currentWeek,
  currentNews,
  onSave,
}: {
  currentDay: string;
  currentWeek: string;
  currentNews: string;
  onSave: (p: { day: string; week: string; news: string }) => void;
}) {
  const [day, setDay] = useState(currentDay);
  const [week, setWeek] = useState(currentWeek);
  const [news, setNews] = useState(currentNews);
  const [tab, setTab] = useState<"day" | "week" | "news">("day");

  // sync local state when settings update from outside
  useEffect(() => setDay(currentDay), [currentDay]);
  useEffect(() => setWeek(currentWeek), [currentWeek]);
  useEffect(() => setNews(currentNews), [currentNews]);

  const value = tab === "day" ? day : tab === "week" ? week : news;
  const setValue = (v: string) => {
    if (tab === "day") setDay(v);
    else if (tab === "week") setWeek(v);
    else setNews(v);
  };

  const dirty =
    day !== currentDay || week !== currentWeek || news !== currentNews;

  function applyAll() {
    onSave({ day: day.trim(), week: week.trim(), news: news.trim() });
  }

  function reset() {
    if (tab === "day") setDay("");
    else if (tab === "week") setWeek("");
    else setNews("");
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={16} className="text-accent" />
        Istruzioni per l'AI
      </div>
      <p className="mb-3 text-xs text-muted">
        Aggiungi indicazioni personali al prompt: tono, focus, vincoli, abitudini.
        Vengono integrate alle istruzioni di base e l'AI continua a vedere tutti i tuoi dati
        (calendario, promemoria, mail, meteo, traffico, notizie).
      </p>

      <div className="-mx-1 mb-3 flex gap-1">
        {(["day", "week", "news"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tap rounded-full px-3 py-1 text-xs font-medium transition ${
              tab === t ? "bg-fg text-bg" : "bg-bg text-muted"
            }`}
          >
            {t === "day" ? "Giornata" : t === "week" ? "Settimana" : "News"}
          </button>
        ))}
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        placeholder={`Scrivi le tue istruzioni per la narrazione "${
          tab === "day" ? "della giornata" : tab === "week" ? "della settimana" : "delle notizie"
        }"…`}
        className="w-full resize-none rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted">vedi esempi</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-bg p-2 text-xs text-muted">
          {PROMPT_HINTS[tab]}
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
          onClick={reset}
          className="tap inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-fg"
          aria-label="Reset"
        >
          <RotateCcw size={14} /> svuota
        </button>
      </div>
    </div>
  );
}
