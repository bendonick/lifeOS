import { NextResponse } from "next/server";
import { runCaptureSync } from "@/lib/capture/sync";

// Pull new lines from the synced capture file and parse them (decision #33/#34).
// Same script launchd runs every 15 minutes — this is the "don't wait" button.
export async function POST() {
  try {
    return NextResponse.json(await runCaptureSync());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
