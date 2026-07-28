import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createDatabaseClient } from "@/lib/drizzle/db";
import {
  getProductionSeedConfig,
  type ProductionSeedConfig,
} from "@/lib/drizzle/seed/production-config";
import { seedProductionDatabase } from "@/lib/drizzle/seed/seed-production";
import type * as schema from "@/lib/drizzle/schema";

type ReleaseDatabase = NodePgDatabase<typeof schema>;

interface ReleaseDatabaseDependencies {
  environment?: Record<string, string | undefined>;
  createClient?: typeof createDatabaseClient;
  migrateDatabase?: (db: ReleaseDatabase) => Promise<void>;
  seedDatabase?: (
    db: ReleaseDatabase,
    config: ProductionSeedConfig,
  ) => Promise<string[]>;
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

function validateBetterAuthEnvironment(
  environment: Record<string, string | undefined>,
) {
  const betterAuthSecret = environment.BETTER_AUTH_SECRET?.trim();
  if (!betterAuthSecret) {
    throw new Error("BETTER_AUTH_SECRET is required for database release.");
  }
  if (betterAuthSecret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET must contain at least 32 characters.",
    );
  }

  const betterAuthUrl = environment.BETTER_AUTH_URL?.trim();
  if (!betterAuthUrl) {
    throw new Error("BETTER_AUTH_URL is required for database release.");
  }

  try {
    new URL(betterAuthUrl);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid URL.");
  }
}

export async function releaseDatabase({
  environment = process.env,
  createClient = createDatabaseClient,
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

  validateBetterAuthEnvironment(environment);
  const seedConfig = getProductionSeedConfig(environment);
  const { pool, db } = createClient(databaseUrl);

  try {
    console.log("Applying Drizzle migrations...");
    await migrateDatabase(db);

    console.log("Running production bootstrap...");
    const messages = await seedDatabase(db, seedConfig);
    for (const message of messages) console.log(message);

    console.log("Database release completed.");
  } finally {
    await pool.end();
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
