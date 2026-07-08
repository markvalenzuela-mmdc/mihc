import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { seedDatabase } from "@/lib/drizzle/seed";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function assertSafeTestDatabaseUrl(testDatabaseUrl: string) {
  const appDatabaseUrl = process.env.DATABASE_URL;
  const testUrl = new URL(testDatabaseUrl);

  if (appDatabaseUrl && appDatabaseUrl === testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL must not match DATABASE_URL.");
  }

  const databaseName = testUrl.pathname.replace(/^\//, "");

  if (!databaseName || !databaseName.includes("test")) {
    throw new Error("TEST_DATABASE_URL database name must include 'test'.");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Test database setup is disabled in production.");
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function getDatabaseName(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl);
  const databaseName = parsedUrl.pathname.replace(/^\//, "");

  if (!databaseName) {
    throw new Error("TEST_DATABASE_URL must include a database name.");
  }

  return databaseName;
}

function getMaintenanceDatabaseUrl(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl);
  parsedUrl.pathname = "/postgres";

  return parsedUrl.toString();
}

async function ensureDatabaseExists(testDatabaseUrl: string) {
  const databaseName = getDatabaseName(testDatabaseUrl);
  const maintenancePool = new Pool({
    connectionString: getMaintenanceDatabaseUrl(testDatabaseUrl),
  });

  try {
    const existingDatabase = await maintenancePool.query(
      "select 1 from pg_database where datname = $1",
      [databaseName],
    );

    if (existingDatabase.rowCount === 0) {
      await maintenancePool.query(
        `create database ${quoteIdentifier(databaseName)}`,
      );
      console.log(`Created test database: ${databaseName}`);
      return;
    }

    console.log(`Test database already exists: ${databaseName}`);
  } finally {
    await maintenancePool.end();
  }
}

async function resetSchema(testDatabaseUrl: string) {
  const pool = new Pool({ connectionString: testDatabaseUrl });

  try {
    console.log("Dropping test database schemas...");
    await pool.query('drop schema if exists "public" cascade');
    await pool.query('drop schema if exists "drizzle" cascade');
    await pool.query('create schema "public"');
  } finally {
    await pool.end();
  }
}

async function runMigrations(testDatabaseUrl: string) {
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  const pool = new Pool({ connectionString: testDatabaseUrl });

  try {
    console.log("Running migrations against test database...");
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

export async function setupTestDatabase() {
  const testDatabaseUrl = getRequiredEnv("TEST_DATABASE_URL");

  assertSafeTestDatabaseUrl(testDatabaseUrl);
  await ensureDatabaseExists(testDatabaseUrl);
  await resetSchema(testDatabaseUrl);
  await runMigrations(testDatabaseUrl);

  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = testDatabaseUrl;

  try {
    await seedDatabase();
  } finally {
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  }

  console.log("Test database setup complete.");
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  setupTestDatabase().catch((error: unknown) => {
    console.error("Test database setup failed.", error);
    process.exitCode = 1;
  });
}
