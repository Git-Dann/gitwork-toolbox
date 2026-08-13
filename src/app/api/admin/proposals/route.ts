import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, githubConfigured, readToken } from "@/lib/admin";
import { type Decision, commitDecisions } from "@/lib/proposals";

export async function POST(request: Request) {
  const session = readToken((await cookies()).get(COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Sign in again — that session has expired." }, { status: 401 });
  }
  if (!githubConfigured()) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN is not set, so decisions cannot be saved yet." },
      { status: 503 },
    );
  }

  let body: { decisions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!Array.isArray(body.decisions) || body.decisions.length === 0) {
    return NextResponse.json({ error: "Nothing to decide." }, { status: 400 });
  }

  const decisions: Decision[] = [];
  for (const raw of body.decisions) {
    const decision = raw as Partial<Decision>;
    if (
      typeof decision.url !== "string" ||
      (decision.decision !== "approve" && decision.decision !== "reject")
    ) {
      return NextResponse.json({ error: "One of those decisions was malformed." }, { status: 400 });
    }
    decisions.push({ url: decision.url, decision: decision.decision });
  }

  try {
    const result = await commitDecisions(decisions);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save those decisions.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
