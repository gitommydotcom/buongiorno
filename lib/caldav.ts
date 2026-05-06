import { createDAVClient, type DAVCalendar, type DAVObject } from "tsdav";
import ICAL from "ical.js";
import { cached } from "./cache";

export type CalEvent = {
  uid: string;
  calendar: string;
  title: string;
  location?: string;
  notes?: string;
  start: string; // ISO UTC
  end: string; // ISO UTC
  allDay: boolean;
  url?: string;
};

export type Reminder = {
  uid: string;
  list: string;
  title: string;
  notes?: string;
  due?: string; // ISO UTC
  completed: boolean;
  priority: number;
  hasTime: boolean;
};

const SERVER_URL = "https://caldav.icloud.com";

function envCreds() {
  const username = process.env.ICLOUD_USERNAME;
  const password = process.env.ICLOUD_APP_PASSWORD;
  if (!username || !password) {
    throw new Error("ICLOUD_USERNAME / ICLOUD_APP_PASSWORD non configurati");
  }
  return { username, password };
}

async function getClient() {
  const { username, password } = envCreds();
  return createDAVClient({
    serverUrl: SERVER_URL,
    credentials: { username, password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

/**
 * Convert an ICAL.Time to an absolute UTC ISO string.
 * Handles UTC, TZID-bound, and floating times correctly using the
 * Intl timezone database (always up-to-date, includes DST rules).
 *
 * Why this matters: Apple iCloud often returns events with
 *   DTSTART;TZID=Europe/Rome:20260506T163000
 * Without resolving that TZID, ical.js's toJSDate() treats the wall time as
 * UTC, then any downstream Europe/Rome formatting double-shifts by the offset.
 */
function icalTimeToISO(t: ICAL.Time | undefined, fallbackTz: string): string | undefined {
  if (!t) return undefined;

  // All-day date (no time component)
  if (t.isDate) {
    // Anchor at midnight in the fallback TZ
    return wallToUtc(t.year, t.month, t.day, 0, 0, 0, fallbackTz).toISOString();
  }

  // Already UTC (DTSTART:...Z)
  // ICAL marks UTC times via t.zone === ICAL.Timezone.utcTimezone
  // and the JSON form sets isUtc-like state; check via tzid:
  const tzid = t.zone?.tzid;
  if (tzid === "Z" || tzid === "UTC") {
    return new Date(Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second)).toISOString();
  }

  // Floating (no zone) → treat as fallback TZ
  const effectiveTz = tzid && tzid !== "floating" ? tzid : fallbackTz;
  return wallToUtc(t.year, t.month, t.day, t.hour, t.minute, t.second, effectiveTz).toISOString();
}

/** Compute UTC offset (in ms) of a given IANA tzid at a given UTC instant. */
function tzOffsetMsAt(tzid: string, instantUtc: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = dtf.formatToParts(instantUtc);
    const m: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== "literal") m[p.type] = Number(p.value);
    }
    const asLocalAsIfUtc = Date.UTC(
      m.year,
      m.month - 1,
      m.day,
      // some locales report 24 for midnight at certain DST transitions
      m.hour === 24 ? 0 : m.hour,
      m.minute,
      m.second,
    );
    return asLocalAsIfUtc - instantUtc.getTime();
  } catch {
    return 0;
  }
}

/** Convert wall-clock time in tzid → absolute UTC Date, DST-correct. */
function wallToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tzid: string): Date {
  // Pretend the wall time is UTC, then subtract the TZ offset to get true UTC.
  // Iterate twice to handle DST boundaries cleanly.
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  const off1 = tzOffsetMsAt(tzid, guess);
  const refined = new Date(guess.getTime() - off1);
  const off2 = tzOffsetMsAt(tzid, refined);
  return new Date(guess.getTime() - off2);
}

/** Register any inline VTIMEZONE components so ICAL.Event TZID lookups succeed too. */
function registerInlineTimezones(comp: ICAL.Component) {
  const vtzs = comp.getAllSubcomponents("vtimezone");
  for (const vt of vtzs) {
    const tzid = vt.getFirstPropertyValue("tzid");
    if (typeof tzid === "string" && !ICAL.TimezoneService.has(tzid)) {
      try {
        ICAL.TimezoneService.register(vt);
      } catch {
        // ignore, fallback handles it
      }
    }
  }
}

function parseEvents(obj: DAVObject, calendarName: string, fallbackTz: string): CalEvent[] {
  if (!obj.data) return [];
  try {
    const jcal = ICAL.parse(obj.data as string);
    const comp = new ICAL.Component(jcal);
    registerInlineTimezones(comp);

    const vevents = comp.getAllSubcomponents("vevent");
    return vevents.map((ve) => {
      const event = new ICAL.Event(ve);
      const start = event.startDate;
      const end = event.endDate ?? start;
      return {
        uid: event.uid,
        calendar: calendarName,
        title: event.summary || "(senza titolo)",
        location: event.location || undefined,
        notes: event.description || undefined,
        start: icalTimeToISO(start, fallbackTz)!,
        end: icalTimeToISO(end, fallbackTz)!,
        allDay: start?.isDate ?? false,
        url: ve.getFirstPropertyValue("url")?.toString() ?? undefined,
      };
    });
  } catch {
    return [];
  }
}

function parseTodos(obj: DAVObject, listName: string, fallbackTz: string): Reminder[] {
  if (!obj.data) return [];
  try {
    const jcal = ICAL.parse(obj.data as string);
    const comp = new ICAL.Component(jcal);
    registerInlineTimezones(comp);

    const vtodos = comp.getAllSubcomponents("vtodo");
    return vtodos.map((vt) => {
      const uid = vt.getFirstPropertyValue("uid")?.toString() ?? "";
      const summary = vt.getFirstPropertyValue("summary")?.toString() ?? "(senza titolo)";
      const description = vt.getFirstPropertyValue("description")?.toString() ?? undefined;
      const status = vt.getFirstPropertyValue("status")?.toString() ?? "";
      const priorityRaw = vt.getFirstPropertyValue("priority");
      const priority = typeof priorityRaw === "number" ? priorityRaw : Number(priorityRaw ?? 0);
      const dueProp = vt.getFirstProperty("due");
      let due: string | undefined;
      let hasTime = false;
      if (dueProp) {
        const dueVal = dueProp.getFirstValue() as ICAL.Time | undefined;
        if (dueVal) {
          due = icalTimeToISO(dueVal, fallbackTz);
          hasTime = !dueVal.isDate;
        }
      }
      return {
        uid,
        list: listName,
        title: summary,
        notes: description,
        due,
        completed: status.toUpperCase() === "COMPLETED",
        priority,
        hasTime,
      };
    });
  } catch {
    return [];
  }
}

function isVtodoCalendar(cal: DAVCalendar): boolean {
  const comps = cal.components ?? [];
  return comps.includes("VTODO");
}

function isVeventCalendar(cal: DAVCalendar): boolean {
  const comps = cal.components ?? [];
  return comps.includes("VEVENT") || comps.length === 0;
}

export async function fetchEvents(rangeStart: Date, rangeEnd: Date, fallbackTz = "Europe/Rome"): Promise<CalEvent[]> {
  const key = `caldav:events:${fallbackTz}:${rangeStart.toISOString()}:${rangeEnd.toISOString()}`;
  return cached(key, 5 * 60, async () => {
    const client = await getClient();
    const calendars = await client.fetchCalendars();
    const eventCals = calendars.filter(isVeventCalendar);
    const all: CalEvent[] = [];
    for (const cal of eventCals) {
      try {
        const objects = await client.fetchCalendarObjects({
          calendar: cal,
          timeRange: {
            start: rangeStart.toISOString(),
            end: rangeEnd.toISOString(),
          },
          expand: true,
        });
        for (const obj of objects) {
          all.push(...parseEvents(obj, cal.displayName?.toString() ?? "Calendario", fallbackTz));
        }
      } catch {
        // singolo calendario rotto: salta
      }
    }
    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();
    return all
      .filter((e) => {
        const s = new Date(e.start).getTime();
        const en = new Date(e.end).getTime();
        return en >= startMs && s <= endMs;
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  });
}

export async function fetchReminders(fallbackTz = "Europe/Rome"): Promise<Reminder[]> {
  return cached(`caldav:reminders:${fallbackTz}`, 5 * 60, async () => {
    const client = await getClient();
    const calendars = await client.fetchCalendars();
    const todoCals = calendars.filter(isVtodoCalendar);
    const all: Reminder[] = [];
    for (const cal of todoCals) {
      try {
        const objects = await client.fetchCalendarObjects({ calendar: cal });
        for (const obj of objects) {
          all.push(...parseTodos(obj, cal.displayName?.toString() ?? "Promemoria", fallbackTz));
        }
      } catch {
        // skip
      }
    }
    return all
      .filter((r) => !r.completed)
      .sort((a, b) => {
        if (a.due && !b.due) return -1;
        if (!a.due && b.due) return 1;
        if (a.due && b.due) return a.due.localeCompare(b.due);
        const ap = a.priority || 99;
        const bp = b.priority || 99;
        return ap - bp;
      });
  });
}
