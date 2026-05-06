"use client";
import { useEffect, useState } from "react";
import type { WeatherSnapshot } from "@/lib/weather";
import type { TrafficIncident } from "@/lib/traffic";
import { Cloud, CloudRain, Sun, CloudSnow, CloudLightning, Wind, TriangleAlert, ChevronDown } from "lucide-react";

function iconFor(code: number) {
  if (code === 0 || code === 1) return Sun;
  if (code >= 2 && code <= 3) return Cloud;
  if (code >= 45 && code <= 48) return Cloud;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 86) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export function DayHeader() {
  const [w, setW] = useState<WeatherSnapshot | null>(null);
  const [traffic, setTraffic] = useState<TrafficIncident[]>([]);
  const [open, setOpen] = useState<"weather" | "traffic" | null>(null);

  useEffect(() => {
    fetch("/api/weather").then((r) => r.json()).then((d) => !d.error && setW(d)).catch(() => {});
    fetch("/api/traffic").then((r) => r.json()).then((d) => setTraffic(d.incidents ?? [])).catch(() => {});
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const NowIcon = w ? iconFor(w.current.code) : Cloud;
  const trafficCount = traffic.length;
  const trafficSevere = traffic.some((t) => t.severity >= 3);

  return (
    <header className="mb-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <p className="text-xs uppercase tracking-widest text-muted">{dateStr}</p>
        {w && (
          <button
            onClick={() => setOpen(open === "weather" ? null : "weather")}
            className="tap glass-chip ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            aria-label="Meteo"
          >
            <NowIcon size={14} className="text-accent" />
            <span>{Math.round(w.current.temp)}°</span>
            <ChevronDown size={11} className={`opacity-60 transition ${open === "weather" ? "rotate-180" : ""}`} />
          </button>
        )}
        <button
          onClick={() => setOpen(open === "traffic" ? null : "traffic")}
          className="tap glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
          aria-label="Traffico"
        >
          <TriangleAlert size={13} className={trafficSevere ? "text-danger" : trafficCount > 0 ? "text-warn" : "text-muted"} />
          <span>{trafficCount === 0 ? "viabilità ok" : trafficCount}</span>
          <ChevronDown size={11} className={`opacity-60 transition ${open === "traffic" ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open === "weather" && w && <WeatherDetails w={w} />}
      {open === "traffic" && <TrafficDetails items={traffic} />}
    </header>
  );
}

function WeatherDetails({ w }: { w: WeatherSnapshot }) {
  return (
    <div className="card mt-3 overflow-hidden p-4 animate-slide-up">
      <div className="flex items-start gap-4">
        <div className="text-xs uppercase tracking-widest text-muted">{w.place}</div>
        <div className="ml-auto text-right text-xs text-muted">
          <div>min {Math.round(w.daily[0].tempMin)}° · max {Math.round(w.daily[0].tempMax)}°</div>
          <div className="mt-1 flex items-center justify-end gap-1">
            <Wind size={11} /> {Math.round(w.current.windKmh)} km/h
          </div>
        </div>
      </div>
      <div className="mt-1 text-sm text-muted">
        {w.current.description} · percepiti {Math.round(w.current.apparent)}°
      </div>
      <div className="no-scrollbar mt-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {w.hourly.slice(0, 12).map((h, i) => {
          const Hi = iconFor(h.code);
          const t = new Date(h.time);
          return (
            <div key={i} className="flex w-14 shrink-0 flex-col items-center gap-1 text-xs">
              <div className="text-muted">
                {i === 0 ? "ora" : t.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <Hi size={18} className="text-fg" />
              <div className="font-medium">{Math.round(h.temp)}°</div>
              {h.precipitationProb > 20 && <div className="text-[10px] text-accent">{h.precipitationProb}%</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrafficDetails({ items }: { items: TrafficIncident[] }) {
  if (items.length === 0) {
    return <div className="card mt-3 p-4 text-sm text-muted animate-slide-up">Nessun evento sulla viabilità nelle vicinanze.</div>;
  }
  return (
    <div className="card mt-3 divide-y divide-border overflow-hidden animate-slide-up">
      {items.slice(0, 6).map((t) => (
        <div key={t.id} className="flex gap-3 p-3 text-sm">
          <TriangleAlert size={16} className={`${t.severity >= 3 ? "text-danger" : "text-warn"} mt-0.5 shrink-0`} />
          <div className="min-w-0 flex-1">
            <div className="capitalize">{t.category} · <span className="text-muted">{t.description}</span></div>
            {(t.from || t.to) && (
              <div className="mt-0.5 text-xs text-muted">
                {t.from}{t.to ? ` → ${t.to}` : ""}
              </div>
            )}
            {t.delaySeconds && t.delaySeconds > 60 && (
              <div className="mt-0.5 text-xs text-warn">+{Math.round(t.delaySeconds / 60)} min ritardo</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
