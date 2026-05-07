import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function startOfDay(d: Date, timezone: string): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = fmt.format(d); // YYYY-MM-DD
  return new Date(`${parts}T00:00:00`);
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function fmtTime(iso: string, timezone: string, locale = "it-IT") {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit", minute: "2-digit", timeZone: timezone,
  });
}

export function fmtDate(iso: string, timezone: string, locale = "it-IT") {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: "long", day: "numeric", month: "long", timeZone: timezone,
  });
}

export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

export function relativeTime(iso: string, locale = "it-IT") {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}
