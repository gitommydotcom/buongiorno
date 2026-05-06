import { NextResponse } from "next/server";
import { fetchInbox } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const mail = await fetchInbox(20);
    return NextResponse.json({ mail });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, mail: [] }, { status: 500 });
  }
}
