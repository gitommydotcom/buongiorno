"use client";
import { useEffect, useState } from "react";
import type { Reminder } from "@/lib/caldav";
import { CheckSquare, AlertTriangle } from "lucide-react";

export function RemindersCard() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((d) => setReminders(d.reminders ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card animate-pulse p-4 text-sm text-muted">Carico promemoria…</div>;

  const now = new Date();
  const overdue = reminders.filter((r) => r.due && new Date(r.due) < now);
  const noDate = reminders.filter((r) => !r.due);

  if (overdue.length === 0 && noDate.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {overdue.length > 0 && (
        <div className="card border-danger/40 bg-danger/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-danger">
            <AlertTriangle size={16} />
            Promemoria scaduti ({overdue.length})
          </div>
          <ul className="space-y-1.5 text-sm">
            {overdue.slice(0, 5).map((r) => (
              <li key={r.uid} className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                <div className="min-w-0 flex-1">
                  <div>{r.title}</div>
                  {r.due && (
                    <div className="text-xs text-muted">
                      scaduto {new Date(r.due).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {noDate.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
            <CheckSquare size={16} />
            Senza scadenza ({noDate.length})
          </div>
          <ul className="space-y-1 text-sm">
            {noDate.slice(0, 6).map((r) => (
              <li key={r.uid} className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                <span>{r.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
