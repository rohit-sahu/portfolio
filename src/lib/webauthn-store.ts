import "server-only";
import { getDb } from "@/lib/mongodb";
import type { StoredCredential } from "@/lib/webauthn";

// Passkeys are stored in MongoDB, not secrets/admin-users.json — that file
// is mounted as a read-only Docker secret in production (see
// docker-compose.yml), so writing to it at runtime (e.g. when an admin
// registers a new passkey from the browser) would silently fail there.
// Mongo is already read-write at runtime for other admin-auth bookkeeping
// (see src/lib/rate-limit.ts), so credentials live alongside that instead.
const COLLECTION = "admin_webauthn_credentials";

type CredentialDoc = StoredCredential & { _id: string };

function toDoc(cred: StoredCredential): CredentialDoc {
  return { ...cred, _id: cred.id };
}

function fromDoc(doc: CredentialDoc): StoredCredential {
  const { _id, ...rest } = doc;
  void _id;
  return rest;
}

// Created lazily (not at module load) so a slow/unavailable MongoDB doesn't
// block server startup; memoized so we only issue the createIndex call once
// per server process. Non-unique — one admin can register multiple passkeys
// — this just speeds up listCredentialsForEmail()/removeCredential() as the
// collection grows, instead of a full collection scan per lookup.
// Never rejects: a missing/failed index (e.g. the Mongo user's role lacks
// the createIndex privilege) must not block passkey registration/login —
// it only means lookups run unindexed until this is fixed. Logged once per
// process instead of rethrown/retried, since a permissions/config problem
// would otherwise fail identically on every subsequent call.
let indexReady: Promise<void> | null = null;
function ensureIndexes(): Promise<void> {
  if (!indexReady) {
    indexReady = (async () => {
      try {
        const db = await getDb();
        await db.collection<CredentialDoc>(COLLECTION).createIndex({ email: 1 });
      } catch (err) {
        console.error(`Failed to ensure index on "${COLLECTION}" (continuing without it):`, err);
      }
    })();
  }
  return indexReady;
}

export async function listCredentialsForEmail(email: string): Promise<StoredCredential[]> {
  await ensureIndexes();
  const db = await getDb();
  const docs = await db
    .collection<CredentialDoc>(COLLECTION)
    .find({ email: email.toLowerCase() })
    .sort({ createdAt: 1 })
    .toArray();
  return docs.map(fromDoc);
}

export async function findCredentialById(credentialId: string): Promise<StoredCredential | null> {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db.collection<CredentialDoc>(COLLECTION).findOne({ _id: credentialId });
  return doc ? fromDoc(doc) : null;
}

// Fails closed (throws) on a duplicate _id — a credential ID colliding with
// one already stored would mean either a genuine reuse attempt or a UUID
// collision; either way it must not silently overwrite the existing record.
export async function addCredential(cred: StoredCredential): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  await db.collection<CredentialDoc>(COLLECTION).insertOne(toDoc(cred));
}

export async function updateCredentialCounter(credentialId: string, counter: number): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  await db.collection<CredentialDoc>(COLLECTION).updateOne({ _id: credentialId }, { $set: { counter } });
}

// Scoped to `email` so one admin can never delete another admin's passkey by
// guessing/observing a credential ID.
export async function removeCredential(email: string, credentialId: string): Promise<boolean> {
  await ensureIndexes();
  const db = await getDb();
  const result = await db
    .collection<CredentialDoc>(COLLECTION)
    .deleteOne({ _id: credentialId, email: email.toLowerCase() });
  return result.deletedCount > 0;
}
