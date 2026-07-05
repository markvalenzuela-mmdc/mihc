import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function getDatabaseUrl() {
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

let cachedConnection: ReturnType<typeof createDatabaseClient> | undefined;

export function getDb() {
  cachedConnection ??= createDatabaseClient();
  return cachedConnection.db;
}

export type Db = ReturnType<typeof getDb>;

export * from "./schema";
