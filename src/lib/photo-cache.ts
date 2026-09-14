import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { filePath as resumeFilePath } from "@/lib/resume-file-cache";

// Lives in the same directory as the resume cache file (same Docker volume,
// no extra mount needed) so a single photo download survives restarts.
function cacheDir() {
  return path.dirname(resumeFilePath());
}
function photoPath() {
  return path.join(cacheDir(), "profile-photo");
}
function metaPath() {
  return `${photoPath()}.meta.json`;
}

type PhotoMeta = { sourceUrl: string; contentType: string };

export async function readCachedPhoto(): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const [bytes, metaRaw] = await Promise.all([
      fs.readFile(/* turbopackIgnore: true */ photoPath()),
      fs.readFile(/* turbopackIgnore: true */ metaPath(), "utf8"),
    ]);
    const meta = JSON.parse(metaRaw) as PhotoMeta;
    return { bytes, contentType: meta.contentType };
  } catch {
    return null;
  }
}

async function getCachedSourceUrl(): Promise<string | null> {
  try {
    const metaRaw = await fs.readFile(/* turbopackIgnore: true */ metaPath(), "utf8");
    return (JSON.parse(metaRaw) as PhotoMeta).sourceUrl;
  } catch {
    return null;
  }
}

async function downloadAndCachePhoto(sourceUrl: string): Promise<void> {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Photo download failed (${res.status}): ${sourceUrl}`);
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const bytes = Buffer.from(await res.arrayBuffer());

  await fs.mkdir(cacheDir(), { recursive: true });
  await fs.writeFile(photoPath(), bytes);
  await fs.writeFile(metaPath(), JSON.stringify({ sourceUrl, contentType } satisfies PhotoMeta));
}

// Downloads and caches `sourceUrl` only if it's a remote URL not already
// cached (i.e. missing, or the admin changed the link) — never throws, since
// a failed refresh shouldn't break a page render or an unrelated save.
export async function ensurePhotoCached(sourceUrl: string): Promise<void> {
  if (!sourceUrl || !sourceUrl.startsWith("http")) return;
  try {
    if ((await getCachedSourceUrl()) === sourceUrl) return;
    await downloadAndCachePhoto(sourceUrl);
  } catch (err) {
    console.error("Failed to cache profile photo:", err);
  }
}
