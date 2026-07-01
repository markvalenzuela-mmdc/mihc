import "dotenv/config";

import { createDatabaseClient } from "@/lib/drizzle/db";
import { getSmokeTestApps } from "@/feature/smoke/services/smoke-test-apps.service";

const { db, pool } = createDatabaseClient();

async function main() {
  const apps = await getSmokeTestApps();

  console.dir(apps, { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
