import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type AdminUser = { email: string; passwordHash: string };

const DEFAULT_PATH = path.join(process.cwd(), "secrets", "admin-users.json");

// Loads the { email, passwordHash }[] admin roster from disk on every call
// (cheap, and lets you add/remove admins without restarting the server).
// Path is overridable via ADMIN_USERS_FILE, which docker-compose points at
// the Docker secret mount (/run/secrets/admin_users) in production.
export async function loadAdminUsers(): Promise<AdminUser[]> {
  // `||`, not `??` — ADMIN_USERS_FILE="" (set-but-empty, e.g. from an .env
  // file with a blank value) must also fall back to the default path.
  const filePath = process.env.ADMIN_USERS_FILE || DEFAULT_PATH;
  try {
    // Read at runtime from a secret mount / gitignored path, not a bundled
    // asset — skip Turbopack's file-tracing for this dynamic path.
    const raw = await readFile(/* turbopackIgnore: true */ filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (u): u is AdminUser =>
        !!u && typeof u.email === "string" && typeof u.passwordHash === "string"
    );
  } catch (err) {
    console.error(`Failed to read admin users file at ${filePath}:`, err);
    return [];
  }
}
