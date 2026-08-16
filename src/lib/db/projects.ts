import { db } from "@/lib/db";
import { PROJECT_STATUSES, type Project, type ProjectStatus } from "@/lib/types";

/** A project carrying its open-task count, so the table doesn't N+1 for a number. */
export interface ProjectWithWork extends Project {
  open_tasks: number;
}

/** Open professional projects, soonest deadline first, undated last. */
export function professionalProjects(): ProjectWithWork[] {
  return db
    .prepare(
      `SELECT projects.*,
              (SELECT COUNT(*) FROM tasks
                WHERE tasks.project_id = projects.id AND tasks.done = 0) AS open_tasks
       FROM projects
       WHERE domain = 'professional' AND status != 'done'
       ORDER BY deadline IS NULL, deadline, name`
    )
    .all() as ProjectWithWork[];
}

/**
 * Which project is the day job (decision #31). One accessor, so the Day job
 * section and the Projects list cannot drift apart. Resolved through a JOIN:
 * a key pointing at a deleted project yields undefined and the page degrades
 * honestly instead of breaking.
 */
export function dayJobProject(): Project | undefined {
  return db
    .prepare(
      `SELECT projects.* FROM projects
       JOIN config ON config.key = 'professional.day_job_project_id'
                  AND CAST(config.value AS INTEGER) = projects.id`
    )
    .get() as Project | undefined;
}

export function dayJobProjectId(): number | null {
  return dayJobProject()?.id ?? null;
}

/** "building · portfolio evidence" — the day job is not portfolio evidence, and
 *  listing it here would restate the section directly above it. */
export function portfolioProjects(): ProjectWithWork[] {
  const dayJob = dayJobProjectId();
  return professionalProjects().filter((p) => p.id !== dayJob);
}

export function projectById(id: number): Project | undefined {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
}

export function projectExists(id: number): boolean {
  return db.prepare("SELECT 1 FROM projects WHERE id = ?").get(id) !== undefined;
}

export interface ProjectInput {
  name: string;
  domain?: Project["domain"];
  status?: ProjectStatus;
  deadline?: string | null;
  notes?: string | null;
}

export function createProject(input: ProjectInput): Project {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO projects (name, domain, status, deadline, notes) VALUES (?, ?, ?, ?, ?)")
    .run(
      input.name,
      input.domain ?? "professional",
      input.status ?? "active",
      input.deadline ?? null,
      input.notes ?? null
    );
  return projectById(Number(lastInsertRowid))!;
}

/** Partial patch: the detail page saves `notes` alone, the table edits the rest. */
export function updateProject(
  id: number,
  patch: Partial<Pick<Project, "name" | "status" | "deadline" | "notes">>
): Project | undefined {
  const fields = Object.keys(patch) as (keyof typeof patch)[];
  if (fields.length > 0) {
    const set = fields.map((f) => `${f} = ?`).join(", ");
    db.prepare(`UPDATE projects SET ${set} WHERE id = ?`).run(...fields.map((f) => patch[f]), id);
  }
  return projectById(id);
}

/** Tasks survive with project_id NULL (schema ON DELETE SET NULL) — deleting a
 *  project must never silently delete its work. */
export function deleteProject(id: number): boolean {
  return db.prepare("DELETE FROM projects WHERE id = ?").run(id).changes > 0;
}

export function isProjectStatus(v: unknown): v is ProjectStatus {
  return typeof v === "string" && (PROJECT_STATUSES as string[]).includes(v);
}
