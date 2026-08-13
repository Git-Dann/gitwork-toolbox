import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/admin";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
