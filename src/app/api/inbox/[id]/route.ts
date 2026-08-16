import { NextRequest, NextResponse } from "next/server";
import { captureExists, captureToNote, captureToTask, dismissCapture } from "@/lib/db/inbox";
import { isDomain } from "@/lib/db/tasks";

// Process a capture: { action: "task", title, domain, due? } | { action: "note", domain? }
// | { action: "dismiss" }. All variants mark the row processed.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  if (!captureExists(id))
    return NextResponse.json({ error: "capture not found or already processed" }, { status: 404 });

  const body = await req.json().catch(() => null);

  switch (body?.action) {
    case "task": {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
      if (!isDomain(body.domain))
        return NextResponse.json({ error: "invalid domain" }, { status: 400 });
      const task = captureToTask(id, {
        title,
        domain: body.domain,
        due: typeof body.due === "string" && body.due ? body.due : null,
      });
      return NextResponse.json({ processed: true, task });
    }
    case "note": {
      const text = typeof body.text === "string" && body.text.trim() ? body.text.trim() : null;
      const domain = isDomain(body.domain) ? body.domain : null;
      if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
      captureToNote(id, text, domain);
      return NextResponse.json({ processed: true });
    }
    case "dismiss":
      dismissCapture(id);
      return NextResponse.json({ processed: true });
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}
