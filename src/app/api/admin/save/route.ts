import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, type Change, commitOverrides, githubConfigured, readToken } from "@/lib/admin";

const KINDS = new Set(["tools", "resources", "starters"]);

export async function POST(request: Request) {
  const session = readToken((await cookies()).get(COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Sign in again — that session has expired." }, { status: 401 });
  }
  if (!githubConfigured()) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN is not set, so changes cannot be saved yet." },
      { status: 503 },
    );
  }

  let body: { changes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!Array.isArray(body.changes) || body.changes.length === 0) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  }

  const changes: Change[] = [];
  for (const raw of body.changes) {
    const change = raw as Partial<Change>;
    if (!change.kind || !KINDS.has(change.kind) || typeof change.slug !== "string") {
      return NextResponse.json({ error: "One of those changes was malformed." }, { status: 400 });
    }
    changes.push({
      kind: change.kind,
      slug: change.slug,
      recommended: Boolean(change.recommended),
      approved: Boolean(change.approved),
      note: typeof change.note === "string" ? change.note.slice(0, 400) : "",
    });
  }

  try {
    const result = await commitOverrides(changes);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save those changes.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
