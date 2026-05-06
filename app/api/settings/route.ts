import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";
import { invalidate } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const saved = await saveSettings(body);
    invalidate(); // cambiato qualcosa di rilevante: butta cache
    return NextResponse.json(saved);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
