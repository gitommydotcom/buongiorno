"use client";
import { useEffect, useState } from "react";
import { MapPin, Clock } from "lucide-react";
import type { CalEvent } from "@/lib/caldav";
import type { Reminder } from "@/lib/caldav";
import { fmtTime } from "@/lib/utils";

type TimelineItem =
  | { type: "event"; data: CalEvent }
  | { type: "reminder"; data: Reminder };

export function Timeline({ timezone = "Europe/Rome" }: { timezone?: string }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/calendar/today").then((r) => r.json()),
      fetch("/api/reminders").then((r) => r.json()),
    ])
      .then(([e, r]) => {
        if (e.error) setErr(e.error);
        setEvents(e.events ?? []);
        setReminders(r.reminders ?? []);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="card animate-pulse p-4 text-sm text-muted">Carico la giornata…</div>;
  }
  if (err) {
    return (
      <div className="card p-4 text-sm text-danger">
        Calendario non raggiungibile: {err}
      </div>
    );
  }

  const today = new Date();
  const todayStr = today.toDateString();
  const todayReminders = reminders.filter((r) => r.due && r.hasTime && new Date(r.due).toDateString() === todayStr);
  const items: TimelineItem[] = [
    ...events.map<TimelineItem>((e) => ({ type: "event" as const, data: e })),
    ...todayReminders.map<TimelineItem>((r) => ({ type: "reminder" as const, data: r })),
  ].sort((a, b) => {
    const ax = a.type === "event" ? a.data.start : a.data.due!;
    const bx = b.type === "event" ? b.data.start : b.data.due!;
    return ax.localeCompare(bx);
  });

  if (items.length === 0) {
    return <div className="card p-5 text-sm text-muted">Nessun impegno con orario per oggi. Giornata libera.</div>;
  }

  const now = new Date();
  return (
    <ul className="card divide-y divide-border overflow-hidden">
      {items.map((it, idx) => {
        const isEvent = it.type === "event";
        const start = isEvent ? it.data.start : it.data.due!;
        const passed = new Date(isEvent ? it.data.end : it.data.due!) < now;
        const ongoing =
          isEvent && new Date(it.data.start) <= now && new Date(it.data.end) >= now;
        return (
          <li
            key={`${it.type}-${idx}-${isEvent ? it.data.uid : it.data.uid}`}
            className={`flex gap-3 p-4 ${passed ? "opacity-50" : ""}`}
          >
            <div className="w-14 shrink-0 text-right">
              <div className={`font-mono text-sm ${ongoing ? "text-accent font-semibold" : ""}`}>
                {fmtTime(start, timezone)}
              </div>
              {isEvent && !it.data.allDay && (
                <div className="text-xs text-muted">{fmtTime(it.data.end, timezone)}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isEvent ? "bg-accent" : "bg-warn"
                  }`}
                />
                <span className="font-medium leading-tight">
                  {isEvent ? it.data.title : `↪ ${it.data.title}`}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                {isEvent && it.data.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} /> {it.data.location}
                  </span>
                )}
                {isEvent && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} /> {it.data.calendar}
                  </span>
                )}
                {!isEvent && <span>Promemoria · {it.data.list}</span>}
              </div>
              {ongoing && <div className="mt-1 text-xs font-semibold text-accent">in corso</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
