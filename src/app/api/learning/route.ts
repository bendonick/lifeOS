import { NextRequest, NextResponse } from "next/server";
import {
  createLearningItem,
  isLearningStatus,
  isLearningType,
  type LearningInput,
} from "@/lib/db/learning";
import { normalizeDate } from "@/lib/dates";

/** Shared body → LearningInput mapping for POST and PATCH. Returns a message on rejection. */
export function readLearningBody(body: unknown): LearningInput | string {
  if (!body || typeof body !== "object") return "invalid body";
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return "topic is required";
  if (b.type !== undefined && !isLearningType(b.type)) return "invalid type";
  if (b.status !== undefined && !isLearningStatus(b.status)) return "invalid status";

  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const rawStarted = text(b.started);
  const started = rawStarted === null ? null : normalizeDate(rawStarted);
  if (rawStarted !== null && started === null) return "started must be YYYY-MM-DD";

  const rawCompleted = text(b.completed);
  const completed = rawCompleted === null ? null : normalizeDate(rawCompleted);
  if (rawCompleted !== null && completed === null) return "completed must be YYYY-MM-DD";

  return {
    name,
    type: isLearningType(b.type) ? b.type : "concept",
    status: isLearningStatus(b.status) ? b.status : "queued",
    link: text(b.link),
    started,
    completed,
    notes: text(b.notes),
  };
}

export async function POST(req: NextRequest) {
  const input = readLearningBody(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  return NextResponse.json(createLearningItem(input), { status: 201 });
}
