import { NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const data = await fetchWeather(s.location.lat, s.location.lon, s.location.name, s.location.timezone);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
