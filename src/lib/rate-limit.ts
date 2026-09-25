import "server-only";
import { getDb } from "@/lib/mongodb";

// Tracks failed /admin login attempts in MongoDB (not in-memory) so lockouts
// survive process restarts/redeploys and would remain correct even if this
// app were ever scaled to more than one instance. Keyed generically (see
// callers in src/auth.ts, which key by "email:<addr>" and "ip:<addr>") so a
// single collection covers both per-account and per-IP throttling.
const COLLECTION = "login_rate_limits";

// 5 failed attempts within a rolling 15-minute window trigger a lockout that
// lasts until 15 minutes after the *last* failed attempt (see recordFailedAttempt).
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type RateLimitDoc = { _id: string; count: number; expiresAt: Date };

// Created lazily (not at module load) so a slow/unavailable MongoDB doesn't
// block server startup; memoized so we only issue the createIndex call once
// per server process. Never rejects: a missing/failed index (e.g. the Mongo
// user's role lacks the createIndex privilege) must not block rate limiting
// itself — it only means queries run unindexed and stale lockouts won't
// auto-expire via TTL until this is fixed. Logged once per process instead
// of rethrown/retried, since a permissions/config problem would otherwise
// fail identically on every subsequent call.
let indexReady: Promise<void> | null = null;
function ensureIndexes(): Promise<void> {
  if (!indexReady) {
    indexReady = (async () => {
      try {
        const db = await getDb();
        // TTL index: MongoDB automatically deletes documents once expiresAt is
        // in the past, so stale/expired lockouts clean themselves up.
        await db.collection<RateLimitDoc>(COLLECTION).createIndex(
          { expiresAt: 1 },
          { expireAfterSeconds: 0 }
        );
      } catch (err) {
        console.error(`Failed to ensure index on "${COLLECTION}" (continuing without it):`, err);
      }
    })();
  }
  return indexReady;
}

// Fails OPEN (returns false) on any MongoDB error — an outage in the rate
// limit store must never lock every admin out of /admin entirely.
export async function isRateLimited(key: string): Promise<boolean> {
  try {
    await ensureIndexes();
    const db = await getDb();
    const doc = await db.collection<RateLimitDoc>(COLLECTION).findOne({ _id: key });
    return !!doc && doc.count >= MAX_ATTEMPTS && doc.expiresAt.getTime() > Date.now();
  } catch (err) {
    console.error(`Rate limit check failed for "${key}", failing open:`, err);
    return false;
  }
}

// Only call this for attempts that were actually checked against
// isRateLimited() first and found not-limited — once locked out, further
// submissions should short-circuit on isRateLimited() without reaching this,
// so expiresAt (and thus the lockout's expiry) only advances on genuine
// unthrottled failures.
export async function recordFailedAttempt(key: string): Promise<void> {
  try {
    await ensureIndexes();
    const db = await getDb();
    await db.collection<RateLimitDoc>(COLLECTION).updateOne(
      { _id: key },
      { $inc: { count: 1 }, $set: { expiresAt: new Date(Date.now() + WINDOW_MS) } },
      { upsert: true }
    );
  } catch (err) {
    console.error(`Failed to record failed login attempt for "${key}":`, err);
  }
}

// Called on successful login to reset the counter for both the email and IP
// keys, so a legitimate sign-in after a mistyped password or two doesn't
// leave a stale count lingering toward the next lockout threshold.
export async function clearAttempts(key: string): Promise<void> {
  try {
    const db = await getDb();
    await db.collection<RateLimitDoc>(COLLECTION).deleteOne({ _id: key });
  } catch (err) {
    console.error(`Failed to clear login rate-limit record for "${key}":`, err);
  }
}
