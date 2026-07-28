import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import {
  closeDb,
  createDatabaseClient,
} from "@/lib/drizzle/db";
import {
  getProductionSeedConfig,
  type ProductionSeedConfig,
} from "@/lib/drizzle/seed/production-config";
import { seedProductionDatabase } from "@/lib/drizzle/seed/seed-production";

interface ReleaseDatabaseDependencies {
  environment?: Record<string, string | undefined>;
  createClient?: typeof createDatabaseClient;
  migrateDatabase?: (
    db: ReturnType<typeof createDatabaseClient>["db"],
  ) => Promise<void>;
  seedDatabase?: (
    db: ReturnType<typeof createDatabaseClient>["db"],
    config: ProductionSeedConfig,
  ) => Promise<string[]>;
  closeAuthDatabase?: typeof closeDb;
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
  closeAuthDatabase = closeDb,
}: ReleaseDatabaseDependencies = {}) {
  if (environment.NODE_ENV !== "production") {
    throw new Error("Database release requires NODE_ENV=production.");
  }

  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database release.");
  }

  const seedConfig = getProductionSeedConfig(environment);
  const client = createClient(databaseUrl);

  try {
    console.log("Applying Drizzle migrations...");
    await migrateDatabase(client.db);

    console.log("Running production bootstrap...");
    const messages = await seedDatabase(client.db, seedConfig);
    for (const message of messages) console.log(message);

    console.log("Database release completed.");
  } finally {
    try {
      await client.pool.end();
    } finally {
      await closeAuthDatabase();
    }
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  releaseDatabase().catch((error: unknown) => {
    console.error("Database release failed.", error);
    process.exitCode = 1;
  });
}
