import { NextResponse } from "next/server";
import { fetchTraffic } from "@/lib/traffic";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    const incidents = await fetchTraffic(s.location.lat, s.location.lon);
    return NextResponse.json({ incidents });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, incidents: [] }, { status: 500 });
  }
}
