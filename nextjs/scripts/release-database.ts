import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createDedicatedDatabaseClient } from "@/lib/drizzle/db";
import {
  getProductionSeedConfig,
  type ProductionSeedConfig,
} from "@/lib/drizzle/seed/production-config";
import { seedProductionDatabase } from "@/lib/drizzle/seed/seed-production";
import type * as schema from "@/lib/drizzle/schema";

const DATABASE_CONNECT_ATTEMPTS = 12;
const DATABASE_CONNECT_RETRY_MS = 5_000;
const DATABASE_RELEASE_LOCK_TIMEOUT_MS = 5 * 60 * 1_000;
const DATABASE_RELEASE_LOCK_NAME = "mihc:production-database-release";

type ReleaseDatabase = NodePgDatabase<typeof schema>;

interface ReleaseDatabaseDependencies {
  environment?: Record<string, string | undefined>;
  createClient?: typeof createDedicatedDatabaseClient;
  connectionAttempts?: number;
  connectionRetryMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  migrateDatabase?: (
    db: ReleaseDatabase,
  ) => Promise<void>;
  seedDatabase?: (
    db: ReleaseDatabase,
    config: ProductionSeedConfig,
  ) => Promise<string[]>;
}

async function closeClient(
  client: ReturnType<typeof createDedicatedDatabaseClient>["client"],
) {
  try {
    await client.end();
  } catch {
    // A failed connection attempt may already have closed its socket.
  }
}

async function connectToDatabase({
  databaseUrl,
  createClient,
  connectionAttempts,
  connectionRetryMs,
  sleep,
}: {
  databaseUrl: string;
  createClient: typeof createDedicatedDatabaseClient;
  connectionAttempts: number;
  connectionRetryMs: number;
  sleep: (milliseconds: number) => Promise<void>;
}) {
  for (let attempt = 1; attempt <= connectionAttempts; attempt += 1) {
    const connection = createClient(databaseUrl);
    let readinessPhase = "connection";

    try {
      await connection.client.connect();
      readinessPhase = "readiness probe";
      await connection.client.query("SELECT 1");
      return connection;
    } catch {
      await closeClient(connection.client);

      if (attempt === connectionAttempts) break;

      console.warn(
        `PostgreSQL ${readinessPhase} failed for database release ` +
          `(attempt ${attempt}/${connectionAttempts}); retrying in ` +
          `${connectionRetryMs / 1_000} seconds.`,
      );
      await sleep(connectionRetryMs);
    }
  }

  throw new Error(
    `Unable to connect to PostgreSQL for database release after ` +
      `${connectionAttempts} attempts. Verify PgDog and PostgreSQL are ` +
      "running and confirm the DATABASE_URL host, port, database, and " +
      "credentials before retrying.",
  );
}

function sanitizeErrorMessage(
  error: unknown,
  environment: Record<string, string | undefined>,
) {
  let message = error instanceof Error ? error.message : "Unknown error.";
  const sensitiveValues = [
    environment.DATABASE_URL,
    environment.BETTER_AUTH_SECRET,
    environment.PROD_MAINTAINER_PASSWORD,
  ].filter((value): value is string => Boolean(value));

  for (const sensitiveValue of sensitiveValues) {
    message = message.replaceAll(sensitiveValue, "[REDACTED]");
  }

  return message;
}

async function acquireReleaseLock(
  client: ReturnType<typeof createDedicatedDatabaseClient>["client"],
) {
  console.log("Waiting for the database release lock...");

  try {
    await client.query(
      `SET lock_timeout = '${DATABASE_RELEASE_LOCK_TIMEOUT_MS}ms'`,
    );
    await client.query(
      "SELECT pg_advisory_lock(hashtextextended($1, 0))",
      [DATABASE_RELEASE_LOCK_NAME],
    );
  } catch {
    throw new Error(
      "Unable to acquire the database release lock within 5 minutes. " +
        "Another release may still be running. Inspect active release " +
        "containers and database connectivity before retrying.",
    );
  }

  console.log("Database release lock acquired.");
}

async function releaseDatabaseLock(
  client: ReturnType<typeof createDedicatedDatabaseClient>["client"],
) {
  try {
    await client.query(
      "SELECT pg_advisory_unlock(hashtextextended($1, 0))",
      [DATABASE_RELEASE_LOCK_NAME],
    );
  } catch {
    console.warn(
      "The database release lock could not be unlocked explicitly; " +
        "closing the dedicated connection will release it.",
    );
  }
}

export async function releaseDatabase({
  environment = process.env,
  createClient = createDedicatedDatabaseClient,
  connectionAttempts = DATABASE_CONNECT_ATTEMPTS,
  connectionRetryMs = DATABASE_CONNECT_RETRY_MS,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  migrateDatabase = async (db) => {
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
  },
  seedDatabase = seedProductionDatabase,
}: ReleaseDatabaseDependencies = {}) {
  if (environment.NODE_ENV !== "production") {
    throw new Error("Database release requires NODE_ENV=production.");
  }

  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database release.");
  }

  const seedConfig = getProductionSeedConfig(environment);
  const connection = await connectToDatabase({
    databaseUrl,
    createClient,
    connectionAttempts,
    connectionRetryMs,
    sleep,
  });

  let lockAcquired = false;

  try {
    await acquireReleaseLock(connection.client);
    lockAcquired = true;

    console.log("Applying Drizzle migrations...");
    await migrateDatabase(connection.db);

    console.log("Running production bootstrap...");
    const messages = await seedDatabase(connection.db, seedConfig);
    for (const message of messages) console.log(message);

    console.log("Database release completed.");
  } finally {
    if (lockAcquired) {
      await releaseDatabaseLock(connection.client);
    }
    await closeClient(connection.client);
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  releaseDatabase().catch((error: unknown) => {
    console.error(
      `Database release failed: ${sanitizeErrorMessage(error, process.env)}`,
    );
    process.exitCode = 1;
  });
}
