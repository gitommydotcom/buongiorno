"use client";
import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

export function Hero({ userName }: { userName: string }) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    setLoading(true);
    setError(null);
    try {
      if (force) await fetch("/api/refresh", { method: "POST" });
      const res = await fetch("/api/ai/narrate-day", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "errore");
      setText(data.text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const now = new Date();
  const greeting = greet(now);
  const dateStr = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="mb-6 animate-fade-in">
      <p className="text-xs uppercase tracking-widest text-muted">{dateStr}</p>
      <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight">
        {greeting}, {userName}.
      </h1>

      <div className="mt-5 card relative overflow-hidden p-5">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted">
          <Sparkles size={14} className="text-accent" />
          <span>il punto della giornata</span>
          <button
            onClick={() => load(true)}
            className="tap ml-auto rounded-full p-1 text-muted hover:text-fg"
            aria-label="Rigenera"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        {loading && !text && <Skeleton lines={5} />}
        {error && (
          <p className="text-sm text-danger">
            {error}. Controlla che <code>GROQ_API_KEY</code>, <code>ICLOUD_*</code> e <code>GOOGLE_*</code> siano configurati.
          </p>
        )}
        {!error && text && <p className="narration whitespace-pre-line">{text}</p>}
      </div>
    </header>
  );
}

function greet(d: Date) {
  const h = d.getHours();
  if (h < 5) return "Notte fonda";
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  if (h < 23) return "Buonasera";
  return "Buonanotte";
}

function Skeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-border" style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}
