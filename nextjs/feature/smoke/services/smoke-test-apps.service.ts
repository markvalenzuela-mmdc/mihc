import { Db, getDb } from "@/lib/drizzle/db";
import { SmokeTestApp } from "../types/smoke-test-apps.types";

export async function getSmokeTestApps(
  db: Db = getDb(),
): Promise<SmokeTestApp[]> {
  const apps = await db.query.apps.findMany({
    orderBy: (apps, { asc }) => [asc(apps.name)],
    with: {
      smokeRuns: {
        orderBy: (smokeRuns, { desc }) => [desc(smokeRuns.runNumber)],
        limit: 10,
      },
    },
  });

  return apps;
}
