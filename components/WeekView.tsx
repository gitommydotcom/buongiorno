"use client";
import { useEffect, useState } from "react";
import type { CalEvent, Reminder } from "@/lib/caldav";
import type { WeatherSnapshot } from "@/lib/weather";
import { Sparkles } from "lucide-react";
import { fmtTime } from "@/lib/utils";

export function WeekView({ timezone = "Europe/Rome" }: { timezone?: string }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [narration, setNarration] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/calendar/week").then((r) => r.json()),
      fetch("/api/reminders").then((r) => r.json()),
      fetch("/api/weather").then((r) => r.json()),
      fetch("/api/ai/narrate-week").then((r) => r.json()),
    ])
      .then(([e, r, w, n]) => {
        setEvents(e.events ?? []);
        setReminders(r.reminders ?? []);
        if (!w.error) setWeather(w);
        if (!n.error) setNarration(n.text ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card animate-pulse p-4 text-sm text-muted">Carico la settimana…</div>;

  const days: { date: Date; label: string; key: string }[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return {
      date: d,
      label: d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "short", timeZone: timezone }),
      key: d.toDateString(),
    };
  });

  const eventsByDay: Record<string, CalEvent[]> = {};
  for (const e of events) {
    const k = new Date(e.start).toDateString();
    eventsByDay[k] = eventsByDay[k] || [];
    eventsByDay[k].push(e);
  }

  const remindersByDay: Record<string, Reminder[]> = {};
  for (const r of reminders) {
    if (!r.due) continue;
    const k = new Date(r.due).toDateString();
    remindersByDay[k] = remindersByDay[k] || [];
    remindersByDay[k].push(r);
  }

  const weatherByDay: Record<string, { min: number; max: number; desc: string }> = {};
  if (weather) {
    for (const d of weather.daily) {
      const k = new Date(d.date).toDateString();
      weatherByDay[k] = { min: d.tempMin, max: d.tempMax, desc: d.description };
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted">
          <Sparkles size={14} className="text-accent" />
          la tua settimana
        </div>
        {narration ? (
          <p className="narration whitespace-pre-line">{narration}</p>
        ) : (
          <p className="text-sm text-muted">Nessuna sintesi disponibile.</p>
        )}
      </div>

      <ul className="space-y-2">
        {days.map(({ date, label, key }) => {
          const evs = eventsByDay[key] ?? [];
          const rems = remindersByDay[key] ?? [];
          const w = weatherByDay[key];
          const isToday = key === new Date().toDateString();
          return (
            <li key={key} className={`card overflow-hidden ${isToday ? "border-accent/60" : ""}`}>
              <div className="flex items-baseline justify-between gap-3 border-b border-border bg-bg px-4 py-2">
                <span className="text-sm font-semibold capitalize">
                  {isToday ? "Oggi · " : ""}{label}
                </span>
                {w && (
                  <span className="text-xs text-muted">
                    {Math.round(w.min)}°/{Math.round(w.max)}° · {w.desc}
                  </span>
                )}
              </div>
              <div className="divide-y divide-border">
                {evs.length === 0 && rems.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted">Nessun impegno.</div>
                )}
                {evs.map((e) => (
                  <div key={e.uid + e.start} className="flex gap-3 px-4 py-2 text-sm">
                    <span className="w-12 shrink-0 font-mono text-xs text-muted">
                      {e.allDay ? "tutto" : fmtTime(e.start, timezone)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{e.title}</span>
                    <span className="shrink-0 text-xs text-muted">{e.calendar}</span>
                  </div>
                ))}
                {rems.map((r) => (
                  <div key={r.uid} className="flex gap-3 px-4 py-2 text-sm">
                    <span className="w-12 shrink-0 font-mono text-xs text-warn">scad.</span>
                    <span className="min-w-0 flex-1 truncate">↪ {r.title}</span>
                    <span className="shrink-0 text-xs text-muted">{r.list}</span>
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
