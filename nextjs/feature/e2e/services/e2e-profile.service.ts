import {
  e2eRuns,
  e2eRunSteps,
  e2eSteps,
  getDb,
  profiles,
} from "@/lib/drizzle/db";
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
import { paginateByQuery } from "@/lib/drizzle/pagination";
import { count, eq, sql } from "drizzle-orm";
import {
  E2eProfileSummary,
  E2eProfileWorkspaceData,
  E2eRunHistoryItem,
  E2eSelectedRun,
} from "../types/e2e-testing.types";
import {
  serializeE2eRun,
  serializeE2eRunHistoryItem,
} from "../serializers/e2e-run.serializer";
import { serializeE2eProfileForm } from "../serializers/e2e-profile-form.serializer";
import { DbExecutor } from "@/types/db-transaction";

export async function getPaginatedE2eProfiles(
  {
    limit = 5,
    page = 1,
  }: {
    limit?: number;
    page?: number;
  },
  db: DbExecutor = getDb(),
) {
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
        flowType: profile.flowType,
        status: profile.status,
        latestRun,
      };
    }),
    meta,
  };
}

export async function getE2eProfileById(
  profileId: string,
  db: DbExecutor = getDb(),
): Promise<E2eProfileWorkspaceData | null> {
  if (!profileId) {
    throw new Error("Profile ID is required");
  }

  const [profile, stepDefinitions, activeRun, latestRun] = await Promise.all([
    db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, profileId),
      with: {
        profileForm: true,
      },
    }),
    db.query.e2eSteps.findMany({
      orderBy: (e2eSteps, { asc }) => [asc(e2eSteps.sortOrder)],
    }),
    db.query.e2eRuns.findFirst({
      where: (e2eRuns, { and, eq }) =>
        and(eq(e2eRuns.profileId, profileId), eq(e2eRuns.status, "running")),
      orderBy: (e2eRuns, { desc }) => [desc(e2eRuns.runNumber)],
      with: {
        startedByUser: true,
        runSteps: {
          with: {
            e2eStep: true,
            tests: true,
          },
          orderBy: (e2eRunSteps, { asc }) => [asc(e2eRunSteps.createdAt)],
        },
      },
    }),
    db.query.e2eRuns.findFirst({
      where: (e2eRuns, { eq }) => eq(e2eRuns.profileId, profileId),
      orderBy: (e2eRuns, { desc }) => [desc(e2eRuns.runNumber)],
    }),
  ]);

  if (!profile) return null;

  const currentDefinitionHash = getEnrollmateDefinitionHash();

  if (!profile.profileForm) {
    throw new Error("Profile form is required for profile workspace");
  }

  const activeRunSerialized = activeRun ? serializeE2eRun(activeRun) : null;

  return {
    profile: {
      ...profile,
      latestRun: latestRun ?? null,
      profileForm: serializeE2eProfileForm(
        profile.profileForm,
        profile.flowType,
        currentDefinitionHash,
      ),
    },
    activeRun: activeRunSerialized,
    stepDefinitions,
  };
}

export async function getPaginatedE2eRunsForProfile(
  {
    profileId,
    limit = 5,
    page = 1,
  }: {
    profileId: string;
    limit?: number;
    page?: number;
  },
  db: DbExecutor = getDb(),
) {
  if (!profileId) {
    throw new Error("Profile ID is required");
  }

  const whereClause = eq(e2eRuns.profileId, profileId);

  const [data, meta] = await paginateByQuery({
    fetchPage: ({ limit, offset }) =>
      db.query.e2eRuns.findMany({
        where: () => whereClause,
        orderBy: (e2eRuns, { desc }) => [desc(e2eRuns.runNumber)],
        limit,
        offset,
        with: {
          startedByUser: true,
        },
      }),
    fetchTotalCount: () =>
      db.select({ total: count() }).from(e2eRuns).where(whereClause),
  }).withPages({
    limit,
    page,
  });

  return {
    data: data.map((run): E2eRunHistoryItem => serializeE2eRunHistoryItem(run)),
    meta,
  };
}

export async function getE2eRunById(
  {
    profileId,
    runId,
  }: {
    profileId: string;
    runId: string;
  },
  db: DbExecutor = getDb(),
): Promise<E2eSelectedRun | null> {
  if (!profileId) {
    throw new Error("Profile ID is required");
  }

  if (!runId) {
    throw new Error("Run ID is required");
  }

  const [run, stepCount, [runSummary]] = await Promise.all([
    db.query.e2eRuns.findFirst({
      where: (e2eRuns, { and, eq }) =>
        and(eq(e2eRuns.profileId, profileId), eq(e2eRuns.id, runId)),
      with: {
        startedByUser: true,
        runSteps: {
          with: {
            e2eStep: true,
            tests: true,
          },
          orderBy: (e2eRunSteps, { asc }) => [asc(e2eRunSteps.createdAt)],
        },
      },
    }),
    db.select({ total: count() }).from(e2eSteps),
    db
      .select({
        includedSteps: count(),
        passedSteps: sql<number>`count(*) filter (where ${e2eRunSteps.status} = 'success')`,
        failedSteps: sql<number>`count(*) filter (where ${e2eRunSteps.status} = 'failure')`,
      })
      .from(e2eRunSteps)
      .where(eq(e2eRunSteps.runId, runId)),
  ]);

  if (!run) return null;

  const totalSteps = stepCount[0]?.total ?? 0;

  return {
    ...serializeE2eRun(run),
    summary: {
      includedSteps: runSummary?.includedSteps ?? 0,
      totalSteps,
      passedSteps: Number(runSummary?.passedSteps ?? 0),
      failedSteps: Number(runSummary?.failedSteps ?? 0),
      durationSeconds: run.completedAt
        ? Math.max(
            0,
            Math.round(
              (run.completedAt.getTime() - run.startedAt.getTime()) / 1000,
            ),
          )
        : null,
    },
  };
}
