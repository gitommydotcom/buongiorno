"use client";
import { useEffect, useMemo, useState } from "react";
import type { Settings, Feed } from "@/lib/settings";
import { defaultSystemPrompt } from "@/lib/prompts";
import { Trash2, Plus, MapPin, Globe, Rss, Check, Sparkles, RotateCcw, Eye, EyeOff } from "lucide-react";

type GeocodeResult = { name: string; country: string; admin1?: string; lat: number; lon: number; timezone: string };

export function SettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
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
      if (res.ok) { setSavedAt(Date.now()); setS(next); }
    } finally { setSaving(false); }
  }

  function pickPlace(g: GeocodeResult) {
    const next: Settings = {
      ...s,
      location: {
        name: [g.name, g.admin1, g.country].filter(Boolean).join(", "),
        lat: g.lat, lon: g.lon, timezone: g.timezone,
      },
    };
    save(next);
    setQuery(""); setResults([]);
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
      {/* Location */}
      <div className="card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <MapPin size={16} className="text-accent" /> Luogo
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

      {/* Language */}
      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Globe size={16} className="text-accent" /> Lingua narrazione AI
        </div>
        <div className="flex gap-2">
          {(["it", "en"] as const).map((l) => (
            <button key={l} onClick={() => save({ ...s, language: l })}
              className={`tap rounded-full px-4 py-2 text-sm ${s.language === l ? "bg-fg text-bg" : "bg-bg text-muted"}`}>
              {l === "it" ? "Italiano" : "English"}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt editor — system + custom */}
      <PromptEditor
        language={s.language}
        currentSystem={s.aiSystemPrompts ?? { day: "", week: "", news: "" }}
        currentCustom={s.aiPrompts ?? { day: "", week: "", news: "" }}
        onSave={(systemPrompts, customPrompts) =>
          save({ ...s, aiSystemPrompts: systemPrompts, aiPrompts: customPrompts })
        }
      />

      {/* Feeds */}
      <FeedsEditor title="Notizie locali" category="local" feeds={s.feeds.local}
        onAdd={(f) => addFeed("local", f)} onRemove={(url) => removeFeed("local", url)} />
      <FeedsEditor title="Notizie Italia" category="italy" feeds={s.feeds.italy}
        onAdd={(f) => addFeed("italy", f)} onRemove={(url) => removeFeed("italy", url)} />
      <FeedsEditor title="Notizie globali" category="global" feeds={s.feeds.global}
        onAdd={(f) => addFeed("global", f)} onRemove={(url) => removeFeed("global", url)} />

      <p className="text-xs text-muted">Le notizie sportive vengono filtrate automaticamente da titoli, categorie e URL.</p>

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
        {(saving || justSaved) && (
          <div className="flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-xs text-bg shadow-lg">
            {saving ? "Salvo…" : <><Check size={12} /> salvato</>}
          </div>
        )}
      </div>
    </div>
  );
}

type PromptSet = { day: string; week: string; news: string };
type PromptTab = "day" | "week" | "news";

function PromptEditor({
  language,
  currentSystem,
  currentCustom,
  onSave,
}: {
  language: "it" | "en";
  currentSystem: PromptSet;
  currentCustom: PromptSet;
  onSave: (system: PromptSet, custom: PromptSet) => void;
}) {
  const [tab, setTab] = useState<PromptTab>("day");
  const [mode, setMode] = useState<"base" | "extra">("base");

  // base (system) prompts
  const [sysDay, setSysDay] = useState(currentSystem.day);
  const [sysWeek, setSysWeek] = useState(currentSystem.week);
  const [sysNews, setSysNews] = useState(currentSystem.news);

  // extra (append) prompts
  const [extDay, setExtDay] = useState(currentCustom.day);
  const [extWeek, setExtWeek] = useState(currentCustom.week);
  const [extNews, setExtNews] = useState(currentCustom.news);

  useEffect(() => { setSysDay(currentSystem.day); }, [currentSystem.day]);
  useEffect(() => { setSysWeek(currentSystem.week); }, [currentSystem.week]);
  useEffect(() => { setSysNews(currentSystem.news); }, [currentSystem.news]);
  useEffect(() => { setExtDay(currentCustom.day); }, [currentCustom.day]);
  useEffect(() => { setExtWeek(currentCustom.week); }, [currentCustom.week]);
  useEffect(() => { setExtNews(currentCustom.news); }, [currentCustom.news]);

  const sysValue = tab === "day" ? sysDay : tab === "week" ? sysWeek : sysNews;
  const extValue = tab === "day" ? extDay : tab === "week" ? extWeek : extNews;

  const setSysValue = (v: string) => {
    if (tab === "day") setSysDay(v);
    else if (tab === "week") setSysWeek(v);
    else setSysNews(v);
  };
  const setExtValue = (v: string) => {
    if (tab === "day") setExtDay(v);
    else if (tab === "week") setExtWeek(v);
    else setExtNews(v);
  };

  const defaultSys = defaultSystemPrompt(language, tab);

  const dirty =
    sysDay !== currentSystem.day || sysWeek !== currentSystem.week || sysNews !== currentSystem.news ||
    extDay !== currentCustom.day || extWeek !== currentCustom.week || extNews !== currentCustom.news;

  function applyAll() {
    onSave(
      { day: sysDay.trim(), week: sysWeek.trim(), news: sysNews.trim() },
      { day: extDay.trim(), week: extWeek.trim(), news: extNews.trim() },
    );
  }

  function resetBase() {
    setSysValue("");
  }

  const tabLabel = (t: PromptTab) => t === "day" ? "Giornata" : t === "week" ? "Settimana" : "News";

  return (
    <div className="card p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={16} className="text-accent" /> Prompt AI
      </div>

      {/* Tab: giornata / settimana / news */}
      <div className="-mx-1 mb-3 mt-3 flex gap-1">
        {(["day", "week", "news"] as PromptTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`tap rounded-full px-3 py-1 text-xs font-medium transition ${
              tab === t ? "bg-fg text-bg" : "bg-bg text-muted"
            }`}>
            {tabLabel(t)}
          </button>
        ))}
      </div>

      {/* Mode: prompt base / extra */}
      <div className="mb-3 flex gap-2 rounded-xl border border-border p-1">
        <button onClick={() => setMode("base")}
          className={`tap flex-1 rounded-lg py-1.5 text-xs font-medium transition ${mode === "base" ? "bg-fg text-bg" : "text-muted"}`}>
          Prompt base
        </button>
        <button onClick={() => setMode("extra")}
          className={`tap flex-1 rounded-lg py-1.5 text-xs font-medium transition ${mode === "extra" ? "bg-fg text-bg" : "text-muted"}`}>
          Istruzioni extra
        </button>
      </div>

      {mode === "base" && (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Questo è il prompt di sistema inviato all'AI. Modificalo per cambiare completamente tono e stile.
            Se vuoi tornare al testo originale, clicca &quot;ripristina default&quot;.
          </p>
          <textarea
            value={sysValue || defaultSys}
            onChange={(e) => setSysValue(e.target.value === defaultSys ? "" : e.target.value)}
            rows={8}
            className="w-full resize-none rounded-xl border border-border bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-accent"
          />
          {sysValue && (
            <button onClick={resetBase}
              className="tap inline-flex items-center gap-1 text-xs text-muted hover:text-danger">
              <RotateCcw size={12} /> ripristina default
            </button>
          )}
          {!sysValue && (
            <p className="text-[11px] text-muted italic">Stai usando il prompt di default — modifica il testo sopra per personalizzarlo.</p>
          )}
        </div>
      )}

      {mode === "extra" && (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Istruzioni che vengono <em>aggiunte</em> al prompt base (o a quello personalizzato).
            Usa queste per abitudini, preferenze e vincoli specifici.
          </p>
          <textarea
            value={extValue}
            onChange={(e) => setExtValue(e.target.value)}
            rows={6}
            placeholder={`Es: "Apri sempre con la cosa più urgente." / "Considera che alle 9 mi alleno."`}
            className="w-full resize-none rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {extValue && (
            <button onClick={() => setExtValue("")}
              className="tap inline-flex items-center gap-1 text-xs text-muted hover:text-danger">
              <RotateCcw size={12} /> svuota
            </button>
          )}
        </div>
      )}

      <div className="mt-3">
        <button
          onClick={applyAll}
          disabled={!dirty}
          className="tap inline-flex w-full items-center justify-center gap-1 rounded-lg bg-fg px-3 py-2 text-sm text-bg disabled:opacity-40"
        >
          <Check size={14} /> {dirty ? "Salva prompt" : "Nessuna modifica"}
        </button>
      </div>
    </div>
  );
}

function FeedsEditor({
  title, category, feeds, onAdd, onRemove,
}: {
  title: string; category: string; feeds: Feed[];
  onAdd: (f: Feed) => void; onRemove: (url: string) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [show, setShow] = useState(false);

  function add() {
    if (!name.trim() || !url.trim()) return;
    try { new URL(url); } catch { return; }
    onAdd({ name: name.trim(), url: url.trim() });
    setName(""); setUrl("");
  }

  return (
    <div className="card p-4">
      <button
        onClick={() => setShow((v) => !v)}
        className="tap mb-1 flex w-full items-center gap-2 text-sm font-semibold"
      >
        <Rss size={16} className="text-accent" />
        {title} <span className="ml-auto text-xs font-normal text-muted">{feeds.length} feed</span>
        {show ? <EyeOff size={14} className="text-muted" /> : <Eye size={14} className="text-muted" />}
      </button>

      {show && (
        <>
          <ul className="mb-3 mt-3 space-y-1.5">
            {feeds.map((f) => (
              <li key={f.url} className="flex items-center gap-2 rounded-lg bg-bg px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{f.name}</div>
                  <div className="truncate text-xs text-muted">{f.url}</div>
                </div>
                <button onClick={() => onRemove(f.url)}
                  className="tap shrink-0 rounded-full p-2 text-muted hover:text-danger" aria-label="Rimuovi">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {feeds.length === 0 && <li className="text-xs text-muted">Nessun feed.</li>}
          </ul>
          <div className="space-y-2">
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder={`Nome (es. ANSA ${category})`}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent" />
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://… (URL del feed RSS)"
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent" />
              <button onClick={add}
                className="tap inline-flex items-center gap-1 rounded-lg bg-fg px-3 text-sm text-bg">
                <Plus size={14} /> aggiungi
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
