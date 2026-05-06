import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setAuthCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { password, from } = (await req.json()) as { password?: string; from?: string };
  if (!password || !checkPassword(password)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, from: from || "/" });
  setAuthCookie(res);
  return res;
}
