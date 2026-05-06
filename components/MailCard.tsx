"use client";
import { useEffect, useState } from "react";
import type { Mail } from "@/lib/gmail";
import { Mail as MailIcon, Star, Inbox } from "lucide-react";

export function MailCard() {
  const [mail, setMail] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gmail/inbox")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        setMail(d.mail ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card animate-pulse p-4 text-sm text-muted">Carico mail…</div>;
  if (error) {
    return (
      <div className="card p-4 text-sm text-muted">
        Gmail non collegato. <a className="text-accent underline" href="/api/gmail/auth">Collega ora</a>.
      </div>
    );
  }

  const important = mail.filter((m) => m.important || m.starred);
  const unread = mail.filter((m) => m.unread && !m.important && !m.starred);
  const featured = [...important, ...unread].slice(0, 6);

  if (featured.length === 0) {
    return (
      <div className="card p-4 text-sm text-muted">
        <Inbox size={14} className="mr-1 inline" />
        Inbox a posto: nessuna mail importante o non letta.
      </div>
    );
  }

  return (
    <ul className="card divide-y divide-border overflow-hidden">
      {featured.map((m) => (
        <li key={m.id} className="flex gap-3 p-3 text-sm">
          <div className="mt-0.5 shrink-0">
            {m.starred ? (
              <Star size={14} className="fill-warn text-warn" />
            ) : m.important ? (
              <span className="block h-2 w-2 rounded-full bg-warn mt-1" />
            ) : (
              <MailIcon size={14} className="text-muted" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-muted">{cleanFrom(m.from)}</div>
            <div className={`truncate ${m.unread ? "font-semibold" : "font-normal"}`}>{m.subject}</div>
            <div className="truncate text-xs text-muted">{m.snippet}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function cleanFrom(from: string) {
  const m = from.match(/^(.*?)<.+>$/);
  return (m?.[1] ?? from).replace(/"/g, "").trim() || from;
}
