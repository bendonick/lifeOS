import fs from "node:fs";
import path from "node:path";

/**
 * Read-only listing of a course's lecture folder (docs/03-pages/academic.md §6).
 * Stage 6 embeds these same files for RAG; showing them now is what starts the
 * filing habit. Server-only — imports node:fs.
 */

const COURSES_ROOT = path.join("data", "academic", "courses");

export interface Material {
  name: string;
  /** Bytes; rendered as KB/MB. */
  size: number;
  /** ISO instant of last modification. */
  modified: string;
}

export interface MaterialsListing {
  /** Repo-relative, so the UI can tell the user exactly where to drop files. */
  dir: string;
  exists: boolean;
  files: Material[];
}

export function lecturesDir(slug: string): string {
  return path.join(COURSES_ROOT, slug, "lectures");
}

export function listMaterials(slug: string): MaterialsListing {
  const dir = lecturesDir(slug);
  const absolute = path.join(process.cwd(), dir);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absolute, { withFileTypes: true });
  } catch {
    return { dir, exists: false, files: [] };
  }
  const files = entries
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .map((e) => {
      const stat = fs.statSync(path.join(absolute, e.name));
      return { name: e.name, size: stat.size, modified: new Date(stat.mtimeMs).toISOString() };
    })
    // Week-prefixed filenames (03-attention.pdf) sort into teaching order for free.
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return { dir, exists: true, files };
}

/** Called when a course is created so the folder is there before the first PDF is. */
export function ensureCourseFolders(slug: string): void {
  try {
    fs.mkdirSync(path.join(process.cwd(), COURSES_ROOT, slug, "lectures"), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), COURSES_ROOT, slug, "notes"), { recursive: true });
  } catch {
    // Not being able to pre-create folders must not fail the course creation.
  }
}
