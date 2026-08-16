import { NextRequest, NextResponse } from "next/server";
import { courseSlug } from "@/lib/academic/course";
import { ensureCourseFolders } from "@/lib/academic/materials";
import { allCourses, createCourse, isCourseStatus, parseWeekdays, type CourseInput } from "@/lib/db/courses";

/** Shared body → CourseInput mapping for POST and PATCH. Returns a message on rejection. */
export function readCourseBody(body: unknown): CourseInput | string {
  if (!body || typeof body !== "object") return "invalid body";
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return "name is required";
  if (b.status !== undefined && !isCourseStatus(b.status)) return "invalid status";

  const number = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    name,
    professor: text(b.professor),
    professor_email: text(b.professor_email),
    credits: number(b.credits),
    room: text(b.room),
    status: isCourseStatus(b.status) ? b.status : "enrolled",
    schedule_days: parseWeekdays(b.schedule_days),
    start_hour: number(b.start_hour),
    end_hour: number(b.end_hour),
    term_start: text(b.term_start),
    term_end: text(b.term_end),
    semester: text(b.semester),
  };
}

export async function GET() {
  return NextResponse.json(allCourses());
}

export async function POST(req: NextRequest) {
  const input = readCourseBody(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  const course = createCourse(input);
  // The materials folder exists from day one so the filing habit has somewhere to go.
  ensureCourseFolders(courseSlug(course.name));
  return NextResponse.json(course, { status: 201 });
}
