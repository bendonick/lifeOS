import { NextRequest, NextResponse } from "next/server";
import { allTasks, createTask, isDomain, isTaskType, weekTasks } from "@/lib/db/tasks";
import { courseById } from "@/lib/db/courses";
import { projectExists } from "@/lib/db/projects";
import { isDueValue } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get("view");
  return NextResponse.json(view === "week" ? weekTasks() : allTasks());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!isDomain(body.domain)) return NextResponse.json({ error: "invalid domain" }, { status: 400 });
  if (body.type !== undefined && !isTaskType(body.type))
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  if (typeof body.due === "string" && body.due && !isDueValue(body.due))
    return NextResponse.json({ error: "due must be YYYY-MM-DD or YYYY-MM-DDTHH:MM" }, { status: 400 });

  // foreign_keys is ON, so an unknown id would throw SQLITE_CONSTRAINT and surface
  // as a 500. Check here and answer 400 with something the form can show.
  if (Number.isInteger(body.course_id) && !courseById(body.course_id))
    return NextResponse.json({ error: "unknown course" }, { status: 400 });
  if (Number.isInteger(body.project_id) && !projectExists(body.project_id))
    return NextResponse.json({ error: "unknown project" }, { status: 400 });

  const task = createTask({
    title,
    domain: body.domain,
    type: body.type,
    due: typeof body.due === "string" && body.due ? body.due : null,
    notes: typeof body.notes === "string" && body.notes ? body.notes : null,
    course_id: Number.isInteger(body.course_id) ? body.course_id : null,
    project_id: Number.isInteger(body.project_id) ? body.project_id : null,
  });
  return NextResponse.json(task, { status: 201 });
}
