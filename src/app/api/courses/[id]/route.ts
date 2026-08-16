import { NextRequest, NextResponse } from "next/server";
import { courseSlug } from "@/lib/academic/course";
import { ensureCourseFolders } from "@/lib/academic/materials";
import { deleteCourse, updateCourse } from "@/lib/db/courses";
import { readCourseBody } from "../route";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const input = readCourseBody(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });

  const course = updateCourse(id, input);
  if (!course) return NextResponse.json({ error: "unknown course" }, { status: 404 });
  ensureCourseFolders(courseSlug(course.name));
  return NextResponse.json(course);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  // Tasks are kept (schema: ON DELETE SET NULL) and the materials folder is left
  // on disk — deleting a course must never take user files or work with it.
  if (!deleteCourse(id)) return NextResponse.json({ error: "unknown course" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
