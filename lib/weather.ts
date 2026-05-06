import { cached } from "./cache";

export type WeatherNow = {
  temp: number;
  apparent: number;
  code: number;
  description: string;
  windKmh: number;
  humidity: number;
  precipitation: number;
  isDay: boolean;
  observedAt: string;
};

export type WeatherHour = {
  time: string;
  temp: number;
  code: number;
  description: string;
  precipitationProb: number;
};

export type WeatherDay = {
  date: string;
  tempMin: number;
  tempMax: number;
  code: number;
  description: string;
  precipitationProb: number;
  sunrise: string;
  sunset: string;
};

export type WeatherSnapshot = {
  place: string;
  current: WeatherNow;
  hourly: WeatherHour[];
  daily: WeatherDay[];
};

const WMO: Record<number, string> = {
  0: "sereno",
  1: "prevalentemente sereno",
  2: "parzialmente nuvoloso",
  3: "coperto",
  45: "nebbia",
  48: "nebbia con brina",
  51: "pioviggine leggera",
  53: "pioviggine moderata",
  55: "pioviggine intensa",
  61: "pioggia leggera",
  63: "pioggia moderata",
  65: "pioggia forte",
  66: "pioggia gelata leggera",
  67: "pioggia gelata forte",
  71: "neve leggera",
  73: "neve moderata",
  75: "neve forte",
  77: "neve granulare",
  80: "rovesci leggeri",
  81: "rovesci moderati",
  82: "rovesci violenti",
  85: "rovesci di neve leggeri",
  86: "rovesci di neve forti",
  95: "temporale",
  96: "temporale con grandine leggera",
  99: "temporale con grandine forte",
};

function describe(code: number): string {
  return WMO[code] ?? "condizioni variabili";
}

export async function fetchWeather(lat: number, lon: number, place: string, timezone: string): Promise<WeatherSnapshot> {
  const key = `weather:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  return cached(key, 30 * 60, async () => {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      timezone,
      current: "temperature_2m,apparent_temperature,is_day,precipitation,relative_humidity_2m,wind_speed_10m,weather_code",
      hourly: "temperature_2m,precipitation_probability,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max",
      forecast_days: "7",
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Open-Meteo errore ${res.status}`);
    const data = (await res.json()) as {
      current: {
        time: string;
        temperature_2m: number;
        apparent_temperature: number;
        is_day: number;
        precipitation: number;
        relative_humidity_2m: number;
        wind_speed_10m: number;
        weather_code: number;
      };
      hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; weather_code: number[] };
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        sunrise: string[];
        sunset: string[];
        precipitation_probability_max: number[];
      };
    };

    const now = new Date();
    const hourly: WeatherHour[] = data.hourly.time
      .map((t, i) => ({
        time: t,
        temp: data.hourly.temperature_2m[i],
        code: data.hourly.weather_code[i],
        description: describe(data.hourly.weather_code[i]),
        precipitationProb: data.hourly.precipitation_probability[i] ?? 0,
      }))
      .filter((h) => new Date(h.time).getTime() >= now.getTime() - 60 * 60 * 1000)
      .slice(0, 24);

    const daily: WeatherDay[] = data.daily.time.map((t, i) => ({
      date: t,
      tempMin: data.daily.temperature_2m_min[i],
      tempMax: data.daily.temperature_2m_max[i],
      code: data.daily.weather_code[i],
      description: describe(data.daily.weather_code[i]),
      precipitationProb: data.daily.precipitation_probability_max[i] ?? 0,
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
    }));

    return {
      place,
      current: {
        temp: data.current.temperature_2m,
        apparent: data.current.apparent_temperature,
        code: data.current.weather_code,
        description: describe(data.current.weather_code),
        windKmh: data.current.wind_speed_10m,
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        isDay: data.current.is_day === 1,
        observedAt: data.current.time,
      },
      hourly,
      daily,
    };
  });
}

export type GeocodeResult = { name: string; country: string; admin1?: string; lat: number; lon: number; timezone: string };

export async function geocode(query: string, language = "it"): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({ name: query, count: "8", language, format: "json" });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: Array<{ name: string; country: string; admin1?: string; latitude: number; longitude: number; timezone: string }> };
  return (data.results ?? []).map((r) => ({
    name: r.name,
    country: r.country,
    admin1: r.admin1,
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone,
  }));
}
