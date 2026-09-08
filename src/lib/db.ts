import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs";

/**
 * Database connection.
 *
 * - If MONGODB_URI is set, we connect straight to it (Atlas / self-hosted).
 * - Otherwise we boot an embedded MongoDB via `mongodb-memory-server`, backed by
 *   an on-disk data dir (./.mongo-data) so data survives dev-server restarts.
 *
 * The connection + memory server are cached on `globalThis` so Next.js HMR in
 * development does not open a new connection on every reload.
 */

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer: unknown | null;
};

const globalForMongoose = globalThis as unknown as { __mongoose?: Cache };

const cache: Cache =
  globalForMongoose.__mongoose ??
  (globalForMongoose.__mongoose = { conn: null, promise: null, memoryServer: null });

async function resolveUri(): Promise<string> {
  const fromEnv = process.env.MONGODB_URI?.trim();
  if (fromEnv) return fromEnv;

  // Lazy import so production bundles that use a real URI never load this.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const dbPath = path.join(process.cwd(), ".mongo-data");
  fs.mkdirSync(dbPath, { recursive: true });

  const server = await MongoMemoryServer.create({
    instance: { dbName: "knesset-predict", dbPath, storageEngine: "wiredTiger" },
  });
  cache.memoryServer = server;
  const uri = server.getUri("knesset-predict");
  console.log(`[db] Using embedded MongoDB at ${uri} (data dir: ${dbPath})`);
  return uri;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = resolveUri().then((uri) =>
      mongoose.connect(uri, { bufferCommands: false }),
    );
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
