import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-.*|manifest.json|login|api/login).*)"],
};

export function middleware(req: NextRequest) {
  if (isAuthenticated(req)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
