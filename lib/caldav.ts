import { createDAVClient, type DAVCalendar, type DAVObject } from "tsdav";
import ICAL from "ical.js";
import { cached } from "./cache";

export type CalEvent = {
  uid: string;
  calendar: string;
  title: string;
  location?: string;
  notes?: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
  url?: string;
};

export type Reminder = {
  uid: string;
  list: string;
  title: string;
  notes?: string;
  due?: string; // ISO
  completed: boolean;
  priority: number; // 0 = none, 1 high .. 9 low
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

function toIso(t: ICAL.Time | undefined): string | undefined {
  if (!t) return undefined;
  return t.toJSDate().toISOString();
}

function parseEvents(obj: DAVObject, calendarName: string): CalEvent[] {
  if (!obj.data) return [];
  try {
    const jcal = ICAL.parse(obj.data as string);
    const comp = new ICAL.Component(jcal);
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
        start: toIso(start)!,
        end: toIso(end)!,
        allDay: start?.isDate ?? false,
        url: ve.getFirstPropertyValue("url")?.toString() ?? undefined,
      };
    });
  } catch {
    return [];
  }
}

function parseTodos(obj: DAVObject, listName: string): Reminder[] {
  if (!obj.data) return [];
  try {
    const jcal = ICAL.parse(obj.data as string);
    const comp = new ICAL.Component(jcal);
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
          due = dueVal.toJSDate().toISOString();
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

export async function fetchEvents(rangeStart: Date, rangeEnd: Date): Promise<CalEvent[]> {
  const key = `caldav:events:${rangeStart.toISOString()}:${rangeEnd.toISOString()}`;
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
          all.push(...parseEvents(obj, cal.displayName?.toString() ?? "Calendario"));
        }
      } catch {
        // singolo calendario rotto: salta
      }
    }
    // filtra eventi che effettivamente cadono nella finestra (post-expand)
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

export async function fetchReminders(): Promise<Reminder[]> {
  return cached("caldav:reminders", 5 * 60, async () => {
    const client = await getClient();
    const calendars = await client.fetchCalendars();
    const todoCals = calendars.filter(isVtodoCalendar);
    const all: Reminder[] = [];
    for (const cal of todoCals) {
      try {
        const objects = await client.fetchCalendarObjects({ calendar: cal });
        for (const obj of objects) {
          all.push(...parseTodos(obj, cal.displayName?.toString() ?? "Promemoria"));
        }
      } catch {
        // skip
      }
    }
    return all
      .filter((r) => !r.completed)
      .sort((a, b) => {
        // ordina per scadenza (con scadenza prima), poi priorità
        if (a.due && !b.due) return -1;
        if (!a.due && b.due) return 1;
        if (a.due && b.due) return a.due.localeCompare(b.due);
        const ap = a.priority || 99;
        const bp = b.priority || 99;
        return ap - bp;
      });
  });
}
