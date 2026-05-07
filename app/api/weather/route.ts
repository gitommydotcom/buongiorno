import { NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const data = await fetchWeather(s.location.lat, s.location.lon, s.location.name, s.location.timezone);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
