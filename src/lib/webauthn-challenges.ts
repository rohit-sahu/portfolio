import "server-only";
import crypto from "node:crypto";
import { getDb } from "@/lib/mongodb";

// Short-lived, one-time-use storage for the random `challenge` value each
// WebAuthn ceremony (registration or authentication) must sign over — kept
// in Mongo (not a cookie) so the login page's "usernameless" flow works
// without needing to correlate a specific browser session up front, and so
// it survives the redirect-heavy Server Action round trip untouched.
const COLLECTION = "webauthn_challenges";
const TTL_MS = 5 * 60 * 1000; // 5 minutes to complete a ceremony

type ChallengeDoc = {
  _id: string; // random nonce, handed to the browser alongside the options
  challenge: string;
  purpose: "registration" | "authentication";
  email?: string; // set for registration (ties it to the admin registering)
  expiresAt: Date;
};

// Never rejects: a missing/failed index (e.g. the Mongo user's role lacks
// the createIndex privilege) must not block passkey ceremonies — it only
// means stale challenge docs won't auto-expire via TTL until this is fixed.
// Logged once per process instead of rethrown/retried, since a
// permissions/config problem would otherwise fail identically every call.
let indexReady: Promise<void> | null = null;
function ensureIndexes(): Promise<void> {
  if (!indexReady) {
    indexReady = (async () => {
      try {
        const db = await getDb();
        await db.collection<ChallengeDoc>(COLLECTION).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      } catch (err) {
        console.error(`Failed to ensure index on "${COLLECTION}" (continuing without it):`, err);
      }
    })();
  }
  return indexReady;
}

export async function storeChallenge(params: {
  challenge: string;
  purpose: "registration" | "authentication";
  email?: string;
}): Promise<string> {
  await ensureIndexes();
  const db = await getDb();
  const nonce = crypto.randomUUID();
  await db.collection<ChallengeDoc>(COLLECTION).insertOne({
    _id: nonce,
    challenge: params.challenge,
    purpose: params.purpose,
    email: params.email?.toLowerCase(),
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  return nonce;
}

// One-time use: deletes the document as part of the lookup (findOneAndDelete)
// so a captured/replayed nonce can never be redeemed twice, and checks
// expiry defensively in case the TTL index hasn't swept it yet.
export async function consumeChallenge(
  nonce: string,
  purpose: "registration" | "authentication"
): Promise<{ challenge: string; email?: string } | null> {
  if (typeof nonce !== "string" || nonce.length === 0) return null;
  const db = await getDb();
  const doc = await db.collection<ChallengeDoc>(COLLECTION).findOneAndDelete({ _id: nonce });
  if (!doc || doc.purpose !== purpose) return null;
  if (doc.expiresAt.getTime() <= Date.now()) return null;
  return { challenge: doc.challenge, email: doc.email };
}
