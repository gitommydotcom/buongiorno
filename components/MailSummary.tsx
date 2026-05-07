"use client";
import { useState } from "react";
import { Mail as MailIcon, Sparkles, RefreshCw, AlertOctagon, Star, Info, Archive } from "lucide-react";

type Section = { title: string; icon: typeof MailIcon; tone: string; items: string[] };

export function MailSummary() {
  const [text, setText] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/summarize-mail", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "errore");
      setText(d.text || "");
      setCount(typeof d.count === "number" ? d.count : null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!text && !loading && !error) {
    return (
      <button
        onClick={load}
        className="tap card flex w-full items-center gap-3 p-4 text-left transition active:scale-[0.99]"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Riassunto mail</div>
          <div className="text-xs text-muted">
            L&apos;AI legge la tua inbox e te la organizza per priorità.
          </div>
        </div>
        <MailIcon size={18} className="shrink-0 text-muted" />
      </button>
    );
  }

  if (loading) {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm text-muted">
        <RefreshCw size={16} className="animate-spin text-accent" />
        L&apos;AI sta leggendo le tue mail…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4 text-sm">
        <div className="text-fg">Riassunto non disponibile.</div>
        <div className="mt-1 break-words text-xs text-danger">{error}</div>
        <button
          onClick={load}
          className="tap mt-3 inline-flex items-center gap-1 rounded-full bg-fg px-3 py-1.5 text-xs text-bg"
        >
          <RefreshCw size={12} /> riprova
        </button>
      </div>
    );
  }

  const sections = parseSections(text || "");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1 text-xs text-muted">
        <Sparkles size={12} className="text-accent" />
        <span>{count !== null ? `${count} mail analizzate` : "riassunto AI"}</span>
        <button
          onClick={load}
          className="tap ml-auto rounded-full p-1 text-muted hover:text-fg"
          aria-label="Rigenera"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="card p-4">
          <p className="narration text-base whitespace-pre-line">{text}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((s) => (
            <SectionCard key={s.title} section={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const Icon = section.icon;
  if (section.items.length === 0 || section.items.every((i) => /^[—-]\s*$/.test(i))) return null;
  return (
    <div className="card overflow-hidden">
      <div className={`flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm font-semibold ${section.tone}`}>
        <Icon size={15} />
        {section.title}
      </div>
      <ul className="divide-y divide-border/60">
        {section.items.map((item, i) => (
          <li key={i} className="px-4 py-2.5 text-sm leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const HEADINGS: { key: string; pattern: RegExp; icon: typeof MailIcon; tone: string }[] = [
  { key: "Urgenti", pattern: /urgent/i, icon: AlertOctagon, tone: "text-danger" },
  { key: "Importanti", pattern: /important/i, icon: Star, tone: "text-warn" },
  { key: "Informative", pattern: /informativ|informational/i, icon: Info, tone: "text-accent" },
  { key: "Da ignorare", pattern: /ignor/i, icon: Archive, tone: "text-muted" },
];

function parseSections(md: string): Section[] {
  const lines = md.split(/\r?\n/);
  const result: Section[] = [];
  let current: Section | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const headingMatch = line.match(/^#{1,3}\s*(.+)$/) || line.match(/^\*\*(.+)\*\*$/);
    if (headingMatch) {
      const label = headingMatch[1].replace(/[*_:]/g, "").trim();
      const found = HEADINGS.find((h) => h.pattern.test(label));
      if (found) {
        current = { title: found.key, icon: found.icon, tone: found.tone, items: [] };
        result.push(current);
        continue;
      }
    }
    if (!current) continue;
    if (/^[-•*]\s*/.test(line)) {
      const text = line.replace(/^[-•*]\s*/, "").trim();
      if (text) current.items.push(text);
    } else if (current.items.length > 0) {
      current.items[current.items.length - 1] += " " + line;
    }
  }
  return result;
}
