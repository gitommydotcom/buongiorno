import { NextRequest, NextResponse } from "next/server";

const COOKIE = "bg_auth";

function expectedToken() {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return Buffer.from(password).toString("base64");
}

export function isAuthenticated(req: NextRequest): boolean {
  const token = expectedToken();
  if (!token) return true; // se non configurato, gate disattivato
  return req.cookies.get(COOKIE)?.value === token;
}

export function setAuthCookie(res: NextResponse) {
  const token = expectedToken();
  if (!token) return;
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 giorni
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.delete(COOKIE);
}

export function checkPassword(password: string): boolean {
  return Boolean(process.env.APP_PASSWORD) && password === process.env.APP_PASSWORD;
}
