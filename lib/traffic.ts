import { cached } from "./cache";

export type TrafficIncident = {
  id: string;
  category: string;
  description: string;
  from?: string;
  to?: string;
  severity: number; // 0=unknown 1=low 2=med 3=high 4=very-high
  delaySeconds?: number;
  startedAt?: string;
  endsAt?: string;
};

const CATEGORY_LABELS: Record<number, string> = {
  0: "sconosciuto",
  1: "incidente",
  2: "nebbia",
  3: "condizioni pericolose",
  4: "pioggia",
  5: "ghiaccio",
  6: "ingorgo",
  7: "lavori",
  8: "strada chiusa",
  9: "restringimento",
  10: "evento",
  11: "evento meteo",
  14: "veicolo rotto",
};

export async function fetchTraffic(lat: number, lon: number): Promise<TrafficIncident[]> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return [];
  const key = `traffic:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  return cached(key, 10 * 60, async () => {
    // bbox di ~25km attorno al punto (rough)
    const dLat = 0.18;
    const dLon = 0.22;
    const minLon = lon - dLon;
    const minLat = lat - dLat;
    const maxLon = lon + dLon;
    const maxLat = lat + dLat;
    const params = new URLSearchParams({
      key: apiKey,
      bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
      fields: "{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity}}}",
      language: "it-IT",
      timeValidityFilter: "present",
    });
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      incidents?: Array<{
        properties?: {
          iconCategory?: number;
          magnitudeOfDelay?: number;
          events?: Array<{ description?: string; iconCategory?: number }>;
          startTime?: string;
          endTime?: string;
          from?: string;
          to?: string;
          delay?: number;
        };
      }>;
    };
    const incidents = data.incidents ?? [];
    return incidents.map<TrafficIncident>((inc, i) => {
      const p = inc.properties ?? {};
      const ev = (p.events ?? [])[0];
      return {
        id: String(i),
        category: CATEGORY_LABELS[p.iconCategory ?? 0] ?? "evento",
        description: ev?.description ?? "evento sulla viabilità",
        from: p.from,
        to: p.to,
        severity: p.magnitudeOfDelay ?? 0,
        delaySeconds: p.delay,
        startedAt: p.startTime,
        endsAt: p.endTime,
      };
    });
  });
}
