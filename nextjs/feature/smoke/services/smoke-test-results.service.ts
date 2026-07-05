import { getDb } from "@/lib/drizzle/db";
import { DbExecutor } from "@/types/db-transaction";

export async function getSmokeTestResultsByRunId(
  runId: string,
  db: DbExecutor = getDb(),
) {
  if (!runId) {
    throw new Error("Run ID is required");
  }

  const results = await db.query.smokeRuns.findFirst({
    with: {
      app: {
        columns: {
          name: true,
        },
      },
      testResults: true,
      startedByUser: true,
    },
    where: (run, { eq }) => eq(run.id, runId),
    orderBy: (run, { desc }) => [desc(run.checkedAt)],
  });

  return results;
}
