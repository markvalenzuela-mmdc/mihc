import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { seedDatabase } from "./seed";

function getMigrationFiles(migrationsDirectory: string) {
  const migrationFiles = fs
    .readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql") && !file.startsWith("."))
    .sort();

  if (migrationFiles.length === 0) {
    throw new Error(`No SQL migrations found in ${migrationsDirectory}.`);
  }

  return migrationFiles;
}

async function resetDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to reset the database.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("Database reset is disabled in production.");
  }

  const migrationsDirectory = path.resolve(process.cwd(), "drizzle");
  const migrationFiles = getMigrationFiles(migrationsDirectory);
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log("Dropping public schema...");
    await pool.query('DROP SCHEMA IF EXISTS "public" CASCADE');

    console.log("Dropping Drizzle migration history...");
    await pool.query('DROP SCHEMA IF EXISTS "drizzle" CASCADE');

    console.log("Recreating public schema...");
    await pool.query('CREATE SCHEMA "public"');

    console.log("Running migrations...");
    await migrate(drizzle(pool), { migrationsFolder: migrationsDirectory });

    for (const migrationFile of migrationFiles) {
      console.log(`  Applied: ${migrationFile}`);
    }
  } finally {
    await pool.end();
  }

  await seedDatabase();
}

resetDatabase()
  .then(() => {
    console.log("Database reset complete.");
  })
  .catch((error: unknown) => {
    console.error("Database reset failed.", error);
    process.exitCode = 1;
  });
