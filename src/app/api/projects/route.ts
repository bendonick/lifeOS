import { NextRequest, NextResponse } from "next/server";
import { createProject, isProjectStatus, type ProjectInput } from "@/lib/db/projects";
import { normalizeDate } from "@/lib/dates";

/** Shared body → ProjectInput mapping for POST and PATCH. Returns a message on rejection. */
export function readProjectBody(body: unknown): ProjectInput | string {
  if (!body || typeof body !== "object") return "invalid body";
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return "name is required";
  if (b.status !== undefined && !isProjectStatus(b.status)) return "invalid status";

  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const raw = text(b.deadline);
  const deadline = raw === null ? null : normalizeDate(raw);
  if (raw !== null && deadline === null) return "deadline must be YYYY-MM-DD";

  return {
    name,
    status: isProjectStatus(b.status) ? b.status : "active",
    deadline,
    notes: text(b.notes),
  };
}

export async function POST(req: NextRequest) {
  const input = readProjectBody(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  return NextResponse.json(createProject(input), { status: 201 });
}
