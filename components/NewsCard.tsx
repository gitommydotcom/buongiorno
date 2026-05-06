"use client";
import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news";
import { Newspaper, Sparkles, ChevronDown } from "lucide-react";

type Tab = "italy" | "local" | "global";

const TAB_LABEL: Record<Tab, string> = {
  local: "Locali",
  italy: "Italia",
  global: "Mondo",
};

export function NewsCard() {
  const [tab, setTab] = useState<Tab>("italy");
  const [data, setData] = useState<{ local: NewsItem[]; italy: NewsItem[]; global: NewsItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [narration, setNarration] = useState<string | null>(null);
  const [narrLoading, setNarrLoading] = useState(false);
  const [showNarr, setShowNarr] = useState(false);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  async function loadNarration() {
    if (narration || narrLoading) {
      setShowNarr((v) => !v);
      return;
    }
    setNarrLoading(true);
    setShowNarr(true);
    try {
      const res = await fetch("/api/ai/narrate-news");
      const d = await res.json();
      setNarration(d.text || "Nessun riassunto disponibile.");
    } catch {
      setNarration("Errore durante il riassunto.");
    } finally {
      setNarrLoading(false);
    }
  }

  if (loading) return <div className="card animate-pulse p-4 text-sm text-muted">Carico notizie…</div>;
  if (!data) return null;

  const items = data[tab];

  return (
    <div className="space-y-2">
      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Newspaper size={16} className="text-muted" />
          <h3 className="text-sm font-semibold">News</h3>
          <button
            onClick={loadNarration}
            className="tap ml-auto inline-flex items-center gap-1 rounded-full bg-bg px-3 py-1 text-xs text-fg hover:text-accent"
          >
            <Sparkles size={12} />
            {showNarr ? "nascondi" : "ascolta riassunto"}
            <ChevronDown size={12} className={`transition ${showNarr ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showNarr && (
          <div className="mb-3 rounded-2xl bg-bg p-3">
            {narrLoading && <p className="text-sm text-muted">L'AI sta leggendo i giornali per te…</p>}
            {!narrLoading && narration && <p className="narration text-base">{narration}</p>}
          </div>
        )}

        <div className="-mx-1 mb-3 flex gap-1">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`tap rounded-full px-3 py-1 text-xs font-medium transition ${
                tab === t ? "bg-fg text-bg" : "bg-bg text-muted"
              }`}
            >
              {TAB_LABEL[t]} · {data[t].length}
            </button>
          ))}
        </div>

        <ul className="space-y-2">
          {items.slice(0, 8).map((n) => (
            <li key={n.link}>
              <a
                href={n.link}
                target="_blank"
                rel="noreferrer"
                className="tap block rounded-xl p-2 -mx-2 hover:bg-bg"
              >
                <div className="text-sm font-medium leading-snug">{n.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <span>{n.source}</span>
                  <span>·</span>
                  <span>{relTime(n.publishedAt)}</span>
                </div>
              </a>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-sm text-muted">Nessuna notizia in questa categoria. Controlla i feed in /impostazioni.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "ora";
  if (diff < 60) return `${Math.round(diff)} min fa`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)} h fa`;
  return `${Math.round(diff / (60 * 24))} g fa`;
}
