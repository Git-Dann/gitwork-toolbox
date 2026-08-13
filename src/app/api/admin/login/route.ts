import { NextResponse } from "next/server";
import {
  COOKIE,
  adminNames,
  authConfigured,
  createToken,
  passwordMatches,
  sessionMaxAge,
} from "@/lib/admin";

export async function POST(request: Request) {
  if (!authConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not set on this deployment." },
      { status: 503 },
    );
  }

  let body: { name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const names = adminNames();
  if (!names.includes(name)) {
    return NextResponse.json({ error: "Pick who you are first." }, { status: 400 });
  }
  if (!passwordMatches(body.password ?? "")) {
    return NextResponse.json({ error: "That password is not right." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, name });
  response.cookies.set(COOKIE, createToken(name), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  });
  return response;
}
