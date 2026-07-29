import "dotenv/config";

import { seedDatabase } from "./seed";
import { resetDatabaseSchema } from "./reset-schema";

export { resetDatabaseSchema } from "./reset-schema";

async function resetDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to reset the database.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("Database reset is disabled in production.");
  }

  await resetDatabaseSchema(databaseUrl);

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
