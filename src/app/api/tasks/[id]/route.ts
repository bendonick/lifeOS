import { NextRequest, NextResponse } from "next/server";
import { courseById } from "@/lib/db/courses";
import { isDomain, isTaskType, updateTask } from "@/lib/db/tasks";
import { isDueValue } from "@/lib/dates";
import type { Task } from "@/lib/types";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const patch: Partial<Pick<Task, "title" | "domain" | "type" | "due" | "done" | "notes" | "course_id">> = {};
  if (body.done !== undefined) patch.done = body.done ? 1 : 0;
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
  if (body.domain !== undefined) {
    if (!isDomain(body.domain)) return NextResponse.json({ error: "invalid domain" }, { status: 400 });
    patch.domain = body.domain;
  }
  if (body.type !== undefined) {
    if (!isTaskType(body.type)) return NextResponse.json({ error: "invalid type" }, { status: 400 });
    patch.type = body.type;
  }
  if (body.due !== undefined) {
    if (body.due && (typeof body.due !== "string" || !isDueValue(body.due)))
      return NextResponse.json({ error: "due must be YYYY-MM-DD or YYYY-MM-DDTHH:MM" }, { status: 400 });
    patch.due = body.due || null;
  }
  if (body.notes !== undefined) patch.notes = body.notes || null;
  // Re-filing: null unfiles, an integer must name a course — foreign_keys is
  // ON, so an unknown id would otherwise surface as a 500.
  if (body.course_id !== undefined) {
    if (body.course_id !== null && !Number.isInteger(body.course_id))
      return NextResponse.json({ error: "course_id must be an integer or null" }, { status: 400 });
    if (body.course_id !== null && !courseById(body.course_id))
      return NextResponse.json({ error: "unknown course" }, { status: 400 });
    patch.course_id = body.course_id;
  }

  const task = updateTask(id, patch);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(task);
}
