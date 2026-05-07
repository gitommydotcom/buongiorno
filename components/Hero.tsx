"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";

export function Hero() {
  const [text, setText] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function load(force = false) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setText("");
    setWaiting(true);
    setStreaming(false);

    try {
      if (force) await fetch("/api/refresh", { method: "POST" });
      const res = await fetch("/api/ai/narrate-day", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `errore ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let received = "";
      let firstChunk = true;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstChunk) {
          setWaiting(false);
          setStreaming(true);
          firstChunk = false;
        }
        received += decoder.decode(value, { stream: true });
        setText(received);
      }
      setStreaming(false);
      setWaiting(false);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setWaiting(false);
      setStreaming(false);
    }
  }

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, []);

  const busy = waiting || streaming;

  return (
    <section className="mb-6 animate-fade-in">
      <div className="card relative overflow-hidden p-5">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted">
          <Sparkles size={14} className="text-accent" />
          <span>il punto della giornata</span>
          <button
            onClick={() => load(true)}
            className="tap ml-auto rounded-full p-1 text-muted hover:text-fg disabled:opacity-50"
            aria-label="Rigenera"
            disabled={busy}
          >
            <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
          </button>
        </div>
        {waiting && !text && <HeroLoader />}
        {error && (
          <p className="text-sm text-danger">
            {error}. Controlla che <code>GROQ_API_KEY</code>, <code>ICLOUD_*</code> e <code>GOOGLE_*</code> siano configurati.
          </p>
        )}
        {!error && text && (
          <p className="narration whitespace-pre-line">
            {text}
            {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-accent align-middle" />}
          </p>
        )}
      </div>
    </section>
  );
}

function HeroLoader() {
  return (
    <div className="flex min-h-[180px] flex-col gap-4">
      <div className="flex items-center gap-2.5 text-sm text-fg">
        <Loader2 size={18} className="animate-spin text-accent" />
        <span className="font-medium">Sto preparando la tua giornata…</span>
      </div>
      <div className="space-y-2.5">
        <div className="h-3 w-[92%] animate-pulse rounded-full bg-fg/15" />
        <div className="h-3 w-[78%] animate-pulse rounded-full bg-fg/15 [animation-delay:120ms]" />
        <div className="h-3 w-[88%] animate-pulse rounded-full bg-fg/15 [animation-delay:240ms]" />
        <div className="h-3 w-[64%] animate-pulse rounded-full bg-fg/15 [animation-delay:360ms]" />
      </div>
    </div>
  );
}
