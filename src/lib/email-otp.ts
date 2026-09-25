import "server-only";
import crypto from "node:crypto";
import { getDb } from "@/lib/mongodb";
import { sendEmail, isEmailConfigured } from "@/lib/email";

// Passwordless "email code" login: a 6-digit code, valid for a short window,
// emailed to the admin's address and single-use. Stored hashed (SHA-256) —
// same reasoning as password hashing, just cheaper since these expire in
// minutes and are only 6 digits either way (a hash still means a MongoDB
// read-access leak alone doesn't hand over a currently-valid code).
const COLLECTION = "email_otp_codes";
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 5;

type OtpDoc = {
  _id: string; // normalized email
  codeHash: string;
  attempts: number;
  expiresAt: Date;
};

// Never rejects: a missing/failed index (e.g. the Mongo user's role lacks
// the createIndex privilege) must not block sending/verifying OTP codes —
// it only means stale codes won't auto-expire via TTL until this is fixed.
// Logged once per process instead of rethrown/retried, since a
// permissions/config problem would otherwise fail identically every call.
let indexReady: Promise<void> | null = null;
function ensureIndexes(): Promise<void> {
  if (!indexReady) {
    indexReady = (async () => {
      try {
        const db = await getDb();
        await db.collection<OtpDoc>(COLLECTION).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      } catch (err) {
        console.error(`Failed to ensure index on "${COLLECTION}" (continuing without it):`, err);
      }
    })();
  }
  return indexReady;
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export { isEmailConfigured };

// Generates and emails a fresh 6-digit code for `email`, overwriting any
// previous unexpired one (so requesting a new code invalidates the old one
// rather than allowing both to work). Caller is responsible for rate
// limiting (see src/lib/rate-limit.ts) and for not leaking whether the
// address belongs to a real admin account.
export async function requestEmailOtp(email: string): Promise<void> {
  await ensureIndexes();
  const normalizedEmail = email.toLowerCase();
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const db = await getDb();
  await db.collection<OtpDoc>(COLLECTION).updateOne(
    { _id: normalizedEmail },
    { $set: { codeHash: hashCode(code), attempts: 0, expiresAt: new Date(Date.now() + CODE_TTL_MS) } },
    { upsert: true }
  );
  await sendEmail(
    normalizedEmail,
    "Your sign-in code",
    `Your sign-in code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`
  );
}

// Verifies `code` for `email`, one-time-use (deletes the doc on success) and
// capped at MAX_VERIFY_ATTEMPTS wrong guesses before the code is invalidated
// outright (forcing a fresh "send code" request rather than allowing
// unlimited guessing against the same 6-digit value).
export async function verifyEmailOtp(email: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const normalizedEmail = email.toLowerCase();
  const db = await getDb();
  const collection = db.collection<OtpDoc>(COLLECTION);
  const doc = await collection.findOne({ _id: normalizedEmail });
  if (!doc || doc.expiresAt.getTime() <= Date.now()) return false;

  if (doc.attempts >= MAX_VERIFY_ATTEMPTS) {
    await collection.deleteOne({ _id: normalizedEmail });
    return false;
  }

  const candidateHash = hashCode(code);
  const matches =
    candidateHash.length === doc.codeHash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(doc.codeHash));

  if (!matches) {
    await collection.updateOne({ _id: normalizedEmail }, { $inc: { attempts: 1 } });
    return false;
  }

  await collection.deleteOne({ _id: normalizedEmail });
  return true;
}
