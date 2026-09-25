import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

// totpSecret, when present, is NOT the raw base32 TOTP secret — it's the
// AES-256-GCM-encrypted form produced by encryptTotpSecret() (see
// src/lib/totp.ts). Decrypt with decryptTotpSecret() before use; never log
// or return it as-is.
export type AdminUser = { email: string; passwordHash: string; totpSecret?: string };

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
    return parsed
      .filter(
        (u): u is AdminUser =>
          !!u && typeof u.email === "string" && typeof u.passwordHash === "string"
      )
      .map((u) => (typeof u.totpSecret === "string" ? u : { email: u.email, passwordHash: u.passwordHash }));
  } catch (err) {
    console.error(`Failed to read admin users file at ${filePath}:`, err);
    return [];
  }
}
