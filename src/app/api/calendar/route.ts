import { NextResponse } from "next/server";
import { calendarWeek } from "@/lib/calendar/ics";
import { mondayOf, zurichToday } from "@/lib/dates";

// Week navigation and the refresh button. ICS expansion is server work (secrets,
// filesystem cache), so the client asks for a window rather than parsing feeds.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const raw = params.get("monday");
  const monday = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? mondayOf(raw) : mondayOf(zurichToday());
  const data = await calendarWeek(monday, { force: params.get("force") === "1" });
  return NextResponse.json({ monday, ...data });
}
