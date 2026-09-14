import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { ResumeData } from "@/data/resume";

const DEFAULT_PATH = path.join(process.cwd(), "data", "resume-cache.json");

// Exported so photo-cache.ts can share the same directory (same Docker
// volume) without needing its own env var.
export function filePath() {
  // `||`, not `??` — an env var set-but-empty must also fall back to the
  // default (see the identical ADMIN_USERS_FILE gotcha in admin-users.ts).
  return process.env.RESUME_CACHE_FILE || DEFAULT_PATH;
}

export async function readResumeFile(): Promise<ResumeData | null> {
  try {
    // Read at runtime from a mounted volume, not a bundled asset — skip
    // Turbopack's file-tracing for this dynamic path.
    const raw = await fs.readFile(/* turbopackIgnore: true */ filePath(), "utf8");
    return JSON.parse(raw) as ResumeData;
  } catch {
    return null;
  }
}

export async function writeResumeFile(data: ResumeData): Promise<void> {
  const target = filePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2) + "\n", "utf8");
}
