"use client";
import { useEffect, useState } from "react";
import type { WeatherSnapshot } from "@/lib/weather";
import { Cloud, CloudRain, Sun, CloudSnow, CloudLightning, Wind } from "lucide-react";

function iconFor(code: number) {
  if (code === 0 || code === 1) return Sun;
  if (code === 2 || code === 3) return Cloud;
  if (code >= 45 && code <= 48) return Cloud;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 86) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export function WeatherCard() {
  const [w, setW] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then((d) => (d.error ? null : setW(d)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card animate-pulse p-4 text-sm text-muted">Carico meteo…</div>;
  if (!w) return null;

  const NowIcon = iconFor(w.current.code);

  return (
    <div className="card overflow-hidden p-4">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-bg p-3">
          <NowIcon size={32} className="text-accent" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-muted">{w.place}</div>
          <div className="text-3xl font-semibold leading-tight">{Math.round(w.current.temp)}°</div>
          <div className="text-sm text-muted">
            {w.current.description} · percepiti {Math.round(w.current.apparent)}°
          </div>
        </div>
        <div className="text-right text-xs text-muted">
          <div>min {Math.round(w.daily[0].tempMin)}°</div>
          <div>max {Math.round(w.daily[0].tempMax)}°</div>
          <div className="mt-1 flex items-center justify-end gap-1">
            <Wind size={11} /> {Math.round(w.current.windKmh)} km/h
          </div>
        </div>
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
