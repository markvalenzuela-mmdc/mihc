import { afterAll, beforeAll } from "vitest";

import { closeDb } from "@/lib/drizzle/db";
import { setupTestDatabase } from "@/scripts/setup-test-db";

let setupPromise: Promise<void> | undefined;

function getTestDatabaseUrl() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for integration tests.");
  }

  return testDatabaseUrl;
}

export function useIntegrationTestDatabase() {
  beforeAll(async () => {
    const testDatabaseUrl = getTestDatabaseUrl();

    setupPromise ??= setupTestDatabase().then(() => {
      process.env.DATABASE_URL = testDatabaseUrl;
    });

    await setupPromise;
    process.env.DATABASE_URL = testDatabaseUrl;
  }, 120_000);

  afterAll(async () => {
    await closeDb();
  });
}
