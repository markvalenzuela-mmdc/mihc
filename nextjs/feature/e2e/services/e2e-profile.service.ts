import { getDb, profiles } from "@/lib/drizzle/db";
import { paginateByQuery } from "@/lib/drizzle/pagination";
import { count } from "drizzle-orm";
import {
  E2eProfileSummary,
  E2eProfileWorkspaceData,
  E2eRun,
} from "../types/e2e-testing.types";

const db = getDb();

export async function getPaginatedE2eProfiles({
  limit = 5,
  page = 1,
}: {
  limit?: number;
  page?: number;
}) {
  const [data, meta] = await paginateByQuery({
    fetchPage: ({ limit, offset }) =>
      db.query.profiles.findMany({
        orderBy: (profiles, { asc }) => [asc(profiles.name)],
        limit,
        offset,
        with: {
          e2eRuns: {
            orderBy: (e2eRuns, { desc }) => [desc(e2eRuns.runNumber)],
            limit: 1,
          },
        },
      }),
    fetchTotalCount: () => db.select({ total: count() }).from(profiles),
  }).withPages({
    limit,
    page,
  });

  return {
    data: data.map((profile): E2eProfileSummary => {
      const latestRun = profile.e2eRuns[0] ?? null;

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        program: profile.program,
        cohort: profile.cohort,
        status: profile.status,
        latestRun,
      };
    }),
    meta,
  };
}

export async function getE2eProfileById(
  profileId: string,
): Promise<E2eProfileWorkspaceData | null> {
  if (!profileId) {
    throw new Error("Profile ID is required");
  }

  const [profile, stepDefinitions] = await Promise.all([
    db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, profileId),
      with: {
        enrollmentData: true,
        e2eRuns: {
          orderBy: (e2eRuns, { desc }) => [desc(e2eRuns.runNumber)],
          with: {
            startedByUser: true,
            runSteps: {
              with: {
                e2eStep: true,
                tests: true,
              },
              orderBy: (runSteps, { asc }) => [asc(runSteps.stepId)],
            },
          },
        },
      },
    }),
    db.query.e2eSteps.findMany({
      orderBy: (e2eSteps, { asc }) => [asc(e2eSteps.sortOrder)],
    }),
  ]);

  if (!profile || !profile.enrollmentData) return null;

  const runs: E2eRun[] = profile.e2eRuns.map((run) => ({
    id: run.id,
    runNumber: run.runNumber,
    profileId: run.profileId,
    status: run.status,
    startedBy: run.startedByUser,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    steps: run.runSteps,
  }));

  const latestRun = runs[0] ?? null;

  return {
    profile: {
      ...profile,
      latestRun,
      enrollmentData: profile.enrollmentData,
    },
    runs,
    stepDefinitions,
  };
}
