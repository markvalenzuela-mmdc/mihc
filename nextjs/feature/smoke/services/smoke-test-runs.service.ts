import { apps, getDb, smokeRuns } from "@/lib/drizzle/db";
import { paginateByQuery } from "@/lib/drizzle/pagination";
import { and, count, eq } from "drizzle-orm";
import { SmokeTestRunStatus } from "../types/smoke-test-apps.types";
import { smokeRunsStatusSchema } from "../schema/smoke-test-runs.schema";
import { DbExecutor } from "@/types/db-transaction";

export async function getPaginatedSmokeTestRuns(
  {
    appId,
    limit = 5,
    page = 1,
    tab,
  }: {
    appId: string;
    limit?: number;
    page?: number;
    tab?: SmokeTestRunStatus;
  },
  db: DbExecutor = getDb(),
) {
  const whereClause = tab
    ? and(eq(smokeRuns.appId, appId), eq(smokeRuns.status, tab))
    : eq(smokeRuns.appId, appId);

  const [data, meta] = await paginateByQuery({
    fetchPage: ({ limit, offset }) =>
      db.query.smokeRuns.findMany({
        where: () => whereClause,
        orderBy: (smokeRuns, { desc }) => [desc(smokeRuns.runNumber)],
        limit,
        offset,
      }),
    fetchTotalCount: () =>
      db.select({ total: count() }).from(smokeRuns).where(whereClause),
  }).withPages({
    limit,
    page,
  });

  return { data, meta };
}
