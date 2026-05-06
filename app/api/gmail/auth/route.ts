import { NextResponse } from "next/server";
import { authorizationUrl } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.redirect(authorizationUrl());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
