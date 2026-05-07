"use client";
import { useRef, useState } from "react";
import { Mail as MailIcon, Sparkles, RefreshCw, Loader2 } from "lucide-react";

export function MailSummary() {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function load() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOpened(true);
    setError(null);
    setText("");
    setLoading(true);
    setStreaming(false);

    try {
      const res = await fetch("/api/ai/summarize-mail", {
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
          setLoading(false);
          setStreaming(true);
          firstChunk = false;
        }
        received += decoder.decode(value, { stream: true });
        setText(received);
      }
      setStreaming(false);
      setLoading(false);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setLoading(false);
      setStreaming(false);
    }
  }

  if (!opened) {
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
          <div className="text-xs text-muted">L&apos;AI scorre l&apos;inbox e te la riassume in poche frasi.</div>
        </div>
        <MailIcon size={18} className="shrink-0 text-muted" />
      </button>
    );
  }

  return (
    <div className="card overflow-hidden p-4">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted">
        <Sparkles size={12} className="text-accent" />
        <span>riassunto inbox</span>
        <button
          onClick={load}
          className="tap ml-auto rounded-full p-1 text-muted hover:text-fg disabled:opacity-50"
          aria-label="Rigenera"
          disabled={loading || streaming}
        >
          <RefreshCw size={14} className={loading || streaming ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && !text && (
        <div className="flex min-h-[100px] flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-fg">
            <Loader2 size={16} className="animate-spin text-accent" />
            <span>L&apos;AI sta leggendo le tue mail…</span>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-[88%] animate-pulse rounded-full bg-fg/15" />
            <div className="h-3 w-[72%] animate-pulse rounded-full bg-fg/15 [animation-delay:120ms]" />
            <div className="h-3 w-[80%] animate-pulse rounded-full bg-fg/15 [animation-delay:240ms]" />
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm">
          <div className="text-fg">Riassunto non disponibile.</div>
          <div className="mt-1 break-words text-xs text-danger">{error}</div>
          <button
            onClick={load}
            className="tap mt-3 inline-flex items-center gap-1 rounded-full bg-fg px-3 py-1.5 text-xs text-bg"
          >
            <RefreshCw size={12} /> riprova
          </button>
        </div>
      )}

      {!error && text && (
        <p className="narration whitespace-pre-line text-base">
          {text}
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-accent align-middle" />
          )}
        </p>
      )}
    </div>
  );
}
