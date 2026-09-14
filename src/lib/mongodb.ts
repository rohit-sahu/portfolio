import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

// Cache the client (and connect promise) across hot-reloads in dev, and
// across invocations in the same server process in production, so we don't
// open a new connection per request.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  const client = new MongoClient(uri);
  return client.connect();
}

export function getMongoClientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = createClientPromise();
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb() {
  const client = await getMongoClientPromise();
  return client.db(process.env.MONGODB_DB ?? "portfolio");
}
