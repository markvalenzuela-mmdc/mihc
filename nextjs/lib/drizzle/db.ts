import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import * as schema from "./schema";

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to Postgres");
  }

  return databaseUrl;
}

export function createDatabaseClient(databaseUrl = getDatabaseUrl()) {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  return {
    pool,
    db: drizzle(pool, { schema }),
  };
}

export function createDedicatedDatabaseClient(databaseUrl = getDatabaseUrl()) {
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
  });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}

let cachedConnection: ReturnType<typeof createDatabaseClient> | undefined;

export function getDb() {
  cachedConnection ??= createDatabaseClient();
  return cachedConnection.db;
}

export async function closeDb() {
  if (!cachedConnection) return;

  await cachedConnection.pool.end();
  cachedConnection = undefined;
}

export * from "./schema";
