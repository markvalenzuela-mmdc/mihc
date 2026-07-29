import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { resetDatabaseSchema } from "@/lib/drizzle/reset-schema";
import { releaseDatabase } from "@/scripts/release-database";

const RESET_ENABLED = "true";

export async function resetProductionDatabase(
  environment: Record<string, string | undefined> = process.env,
) {
  if (environment.NODE_ENV !== "production") {
    throw new Error("Production-style reset requires NODE_ENV=production.");
  }

  if (environment.DATABASE_RESET !== RESET_ENABLED) {
    throw new Error(
      "Refusing to reset the database. Set DATABASE_RESET=true.",
    );
  }

  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for a production-style reset.");
  }

  await resetDatabaseSchema(
    databaseUrl,
    path.resolve(process.cwd(), "drizzle"),
    { runMigrations: false },
  );
  await releaseDatabase({ environment });
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  resetProductionDatabase().catch((error: unknown) => {
    console.error("Production database reset failed.", error);
    process.exitCode = 1;
  });
}
