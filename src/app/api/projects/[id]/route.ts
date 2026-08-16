import { NextRequest, NextResponse } from "next/server";
import { deleteProject, updateProject } from "@/lib/db/projects";
import { readProjectBody } from "../route";

/**
 * Two shapes: a notes-only save from the detail page, or a full edit from the
 * table. Anything else goes through the shared body reader.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const body = await req.json().catch(() => null);

  if (body && typeof body === "object" && !("name" in body) && "notes" in body) {
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
    const project = updateProject(id, { notes });
    if (!project) return NextResponse.json({ error: "unknown project" }, { status: 404 });
    return NextResponse.json(project);
  }

  const input = readProjectBody(body);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  const project = updateProject(id, {
    name: input.name,
    status: input.status,
    deadline: input.deadline ?? null,
    notes: input.notes ?? null,
  });
  if (!project) return NextResponse.json({ error: "unknown project" }, { status: 404 });
  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  // Tasks are kept with project_id NULL (schema ON DELETE SET NULL).
  if (!deleteProject(id)) return NextResponse.json({ error: "unknown project" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
