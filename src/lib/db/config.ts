import { db } from "./index";

export function getConfig(key: string): string | null {
  const row = db.prepare("SELECT value FROM config WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function getConfigJSON<T>(key: string, fallback: T): T {
  const raw = getConfig(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setConfig(key: string, value: string) {
  db.prepare(
    "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}
