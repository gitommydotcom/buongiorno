import { NextRequest, NextResponse } from "next/server";
import { geocode } from "@/lib/weather";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  const results = await geocode(q);
  return NextResponse.json({ results });
}
