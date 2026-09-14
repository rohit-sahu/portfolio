import "server-only";
import { getDb } from "@/lib/mongodb";
import { defaultResumeData, type ResumeData } from "@/data/resume";
import { readResumeFile, writeResumeFile } from "@/lib/resume-file-cache";
import { ensurePhotoCached } from "@/lib/photo-cache";

const RESUME_DOC_ID = "main";

// Serializes updateResumeData calls: without this, two overlapping saves
// could both read the same "current" file state before either write lands,
// and the second write would silently discard the first save's change.
let writeLock: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeLock.then(fn, fn);
  // A failed save must not permanently wedge the lock for later ones.
  writeLock = run.catch(() => undefined);
  return run;
}

type ResumeDocument = ResumeData & { _id: string };

// Shallow-fills any field missing from persisted data (file or MongoDB) with
// its default — protects against older documents/cache files predating a
// schema addition (e.g. profile.photoUrl) from crashing the app.
function withDefaults(data: ResumeData): ResumeData {
  return {
    ...defaultResumeData,
    ...data,
    profile: { ...defaultResumeData.profile, ...data.profile },
  };
}

async function fetchFromMongo(): Promise<ResumeData | null> {
  try {
    const db = await getDb();
    const doc = await db.collection<ResumeDocument>("resume").findOne({ _id: RESUME_DOC_ID });
    if (!doc) return null;
    return {
      profile: doc.profile,
      summary: doc.summary,
      stats: doc.stats,
      skillGroups: doc.skillGroups,
      experiences: doc.experiences,
      education: doc.education,
    };
  } catch (err) {
    console.error("Failed to load resume data from MongoDB:", err);
    return null;
  }
}

// Reads are served from the local cache file (fast, no DB round trip) and
// never hit MongoDB except on cold start, when the file doesn't exist yet
// (e.g. a fresh volume) — that one-time read is written forward to the file
// so every subsequent read avoids the database entirely. ensurePhotoCached
// is called on every read too (not just cold start) — it's a cheap local
// check that self-heals if the photo cache is ever missing on its own.
export async function getResumeData(): Promise<ResumeData> {
  const cached = await readResumeFile();
  if (cached) {
    const data = withDefaults(cached);
    await ensurePhotoCached(data.profile.photoUrl);
    return data;
  }

  const data = withDefaults((await fetchFromMongo()) ?? defaultResumeData);
  await ensurePhotoCached(data.profile.photoUrl);
  await writeResumeFile(data).catch((err) =>
    console.error("Failed to write resume cache file:", err)
  );
  return data;
}

// Creates the "main" document with default content if it doesn't exist yet,
// and seeds the local cache file to match. Called once from
// instrumentation.ts at server startup so both exist immediately, instead of
// only after the first admin save.
export async function ensureResumeSeeded(): Promise<void> {
  const db = await getDb();
  await db.collection<ResumeDocument>("resume").updateOne(
    { _id: RESUME_DOC_ID },
    { $setOnInsert: { _id: RESUME_DOC_ID, ...defaultResumeData } },
    { upsert: true }
  );

  const cached = await readResumeFile();
  if (!cached) {
    const seeded = (await fetchFromMongo()) ?? defaultResumeData;
    await ensurePhotoCached(seeded.profile.photoUrl);
    await writeResumeFile(seeded);
  }
}

// Merges `patch` into the single "main" resume document (creating it, seeded
// with the remaining defaults, if it doesn't exist yet), then writes the
// merged result to MongoDB (source of truth) and the cache file (what reads
// actually use), so the two never drift out of sync.
export async function updateResumeData(patch: Partial<ResumeData>): Promise<void> {
  return withWriteLock(async () => {
    const db = await getDb();
    const patchKeys = new Set(Object.keys(patch));
    const setOnInsert = Object.fromEntries(
      Object.entries(defaultResumeData).filter(([key]) => !patchKeys.has(key))
    );

    await db.collection<ResumeDocument>("resume").updateOne(
      { _id: RESUME_DOC_ID },
      {
        $set: patch,
        ...(Object.keys(setOnInsert).length > 0 ? { $setOnInsert: setOnInsert } : {}),
      },
      { upsert: true }
    );

    const current = withDefaults((await readResumeFile()) ?? (await fetchFromMongo()) ?? defaultResumeData);
    const merged = { ...current, ...patch };
    await ensurePhotoCached(merged.profile.photoUrl);
    await writeResumeFile(merged);
  });
}
