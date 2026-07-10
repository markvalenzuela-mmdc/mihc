import "dotenv/config";

import { fileURLToPath } from "node:url";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";

import { seedE2eRuns } from "./seed/seed-e2e-runs";
import { seedE2eSteps } from "./seed/seed-e2e-steps";
import { seedOperatorAndApps } from "./seed/seed-operator";
import { seedProfiles } from "./seed/seed-profiles";
import { seedSmokeRuns } from "./seed/seed-smoke-runs";
import * as schema from "./schema";

export async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to seed the database.");

  console.log("Seeding database...");

  const seedDb = drizzle({
    connection: { connectionString: databaseUrl },
    schema,
  });
  const successMessages: string[] = [];

  try {
    await seedDb.transaction(async (tx) => {
      successMessages.push(...await seedOperatorAndApps(tx));
      successMessages.push(...await seedSmokeRuns(tx));
      successMessages.push(...await seedE2eSteps(tx));
      successMessages.push(...await seedProfiles(tx));
      successMessages.push(...await seedE2eRuns(tx));
    });

    for (const message of successMessages) console.log(message);
    console.log("Database seed completed.");
  } finally {
    await seedDb.$client.end();
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  seedDatabase().catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  });
}
