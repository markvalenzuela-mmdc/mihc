import { apps, getDb, smokeRuns } from "@/lib/drizzle/db";
import { paginateByQuery } from "@/lib/drizzle/pagination";
import { count, eq } from "drizzle-orm";

const db = getDb();

export async function getPaginatedSmokeTestRuns({
  appId,
  limit = 5,
  page = 1,
}: {
  appId: string;
  limit?: number;
  page?: number;
}) {
  const [data, meta] = await paginateByQuery({
    fetchPage: ({ limit, offset }) =>
      db.query.smokeRuns.findMany({
        where: (smokeRuns, { eq }) => eq(smokeRuns.appId, appId),
        orderBy: (smokeRuns, { desc }) => [desc(smokeRuns.runNumber)],
        limit,
        offset,
      }),
    fetchTotalCount: () =>
      db
        .select({ total: count() })
        .from(smokeRuns)
        .where(eq(smokeRuns.appId, appId)),
  }).withPages({
    limit,
    page,
  });

  return { data, meta };
}
