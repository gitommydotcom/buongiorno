import { NextResponse } from "next/server";
import { invalidate } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function POST() {
  invalidate();
  return NextResponse.json({ ok: true });
}
