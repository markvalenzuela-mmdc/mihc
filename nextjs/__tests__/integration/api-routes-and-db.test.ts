import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import {
  apps,
  e2eRuns,
  e2eRunSteps,
  getDb,
  smokeRuns,
  smokeRunsTestResults,
} from "@/lib/drizzle/db";
import { useIntegrationTestDatabase } from "./helpers/test-db";

const seededSmokeRunId = "a37acbf2-19c4-4fb1-b39f-d3abf5fd7121";
const seededProfileId = "3591b2d2-886b-45c6-bcbd-3c8756b40101";
const seededE2eRunId = "dd71418a-90e0-49ec-98ad-ff14a806f501";

type RouteContext<TParams> = {
  params: Promise<TParams>;
};

type GetSmokeRunRoute = (
  request: Request,
  context: RouteContext<{ runId: string }>,
) => Promise<Response>;

type GetE2eProfileRoute = (
  request: Request,
  context: RouteContext<{ profileId: string }>,
) => Promise<Response>;

type GetE2eProfileRunsRoute = (
  request: Request,
  context: RouteContext<{ profileId: string }>,
) => Promise<Response>;

type GetE2eRunRoute = (
  request: Request,
  context: RouteContext<{ profileId: string; runId: string }>,
) => Promise<Response>;

function createRequest(path: string) {
  return new Request(`http://localhost:3000${path}`);
}

describe("API route and database integration", () => {
  useIntegrationTestDatabase();

  let getSmokeRun: GetSmokeRunRoute;
  let getE2eProfile: GetE2eProfileRoute;
  let getE2eProfileRuns: GetE2eProfileRunsRoute;
  let getE2eRun: GetE2eRunRoute;

  beforeAll(async () => {
    [{ GET: getSmokeRun }, { GET: getE2eProfile }, { GET: getE2eProfileRuns }, { GET: getE2eRun }] =
      await Promise.all([
        import("@/app/api/smoke-runs/[runId]/route"),
        import("@/app/api/e2e-profiles/[profileId]/route"),
        import("@/app/api/e2e-profiles/[profileId]/runs/route"),
        import("@/app/api/e2e-profiles/[profileId]/runs/[runId]/route"),
      ]);
  });

  describe("existing read API routes", () => {
    it("returns smoke run details for a seeded run", async () => {
      const response = await getSmokeRun(
        createRequest(`/api/smoke-runs/${seededSmokeRunId}`),
        { params: Promise.resolve({ runId: seededSmokeRunId }) },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.appName).toBe("Website");
      expect(body.data.details.id).toBe(seededSmokeRunId);
      expect(body.data.results).toHaveLength(4);
    });

    it("returns 404 for a missing smoke run", async () => {
      const missingRunId = "00000000-0000-4000-8000-000000000000";
      const response = await getSmokeRun(
        createRequest(`/api/smoke-runs/${missingRunId}`),
        { params: Promise.resolve({ runId: missingRunId }) },
      );
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({
        ok: false,
        error: "Smoke run not found",
      });
    });

    it("returns E2E profile workspace data for a seeded profile", async () => {
      const response = await getE2eProfile(
        createRequest(`/api/e2e-profiles/${seededProfileId}`),
        { params: Promise.resolve({ profileId: seededProfileId }) },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.profile.id).toBe(seededProfileId);
      expect(body.data.profile.name).toBe("Ari Santos");
      expect(body.data.stepDefinitions).toHaveLength(8);
    });

    it("returns 404 for a missing E2E profile", async () => {
      const missingProfileId = "00000000-0000-4000-8000-000000000000";
      const response = await getE2eProfile(
        createRequest(`/api/e2e-profiles/${missingProfileId}`),
        { params: Promise.resolve({ profileId: missingProfileId }) },
      );
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({
        ok: false,
        error: "E2E profile not found",
      });
    });

    it("returns paginated E2E runs for a seeded profile", async () => {
      const response = await getE2eProfileRuns(
        createRequest(`/api/e2e-profiles/${seededProfileId}/runs?page=1&limit=5`),
        { params: Promise.resolve({ profileId: seededProfileId }) },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.data).toHaveLength(5);
      expect(body.data.meta.totalCount).toBeGreaterThan(5);
    });

    it("returns selected E2E run details for a seeded run", async () => {
      const response = await getE2eRun(
        createRequest(`/api/e2e-profiles/${seededProfileId}/runs/${seededE2eRunId}`),
        {
          params: Promise.resolve({
            profileId: seededProfileId,
            runId: seededE2eRunId,
          }),
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.id).toBe(seededE2eRunId);
      expect(body.data.summary.includedSteps).toBe(8);
      expect(body.data.steps).toHaveLength(8);
    });

    it("returns 404 for a missing E2E run", async () => {
      const missingRunId = "00000000-0000-4000-8000-000000000000";
      const response = await getE2eRun(
        createRequest(`/api/e2e-profiles/${seededProfileId}/runs/${missingRunId}`),
        {
          params: Promise.resolve({
            profileId: seededProfileId,
            runId: missingRunId,
          }),
        },
      );
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({
        ok: false,
        error: "E2E run not found",
      });
    });
  });

  describe("Drizzle integration", () => {
    it("inserts and queries a smoke run with test results", async () => {
      const db = getDb();
      const runId = randomUUID();

      try {
        await db.insert(smokeRuns).values({
          id: runId,
          runNumber: 90_001,
          appId: "website",
          status: "success",
          trigger: "manual",
          total: 1,
          passed: 1,
          failed: 0,
          durationSeconds: 12,
          checkedAt: new Date("2026-07-08T00:00:00.000Z"),
        });

        await db.insert(smokeRunsTestResults).values({
          id: randomUUID(),
          runId,
          testName: "Integration fixture responds",
          testFile: "integration/smoke.spec.ts",
          status: "success",
          durationMs: 1200,
        });

        const insertedRun = await db.query.smokeRuns.findFirst({
          where: (smokeRuns, { eq }) => eq(smokeRuns.id, runId),
          with: {
            app: true,
            testResults: true,
          },
        });

        expect(insertedRun?.app.name).toBe("Website");
        expect(insertedRun?.testResults).toHaveLength(1);
        expect(insertedRun?.testResults[0].testName).toBe(
          "Integration fixture responds",
        );
      } finally {
        await db
          .delete(smokeRunsTestResults)
          .where(eq(smokeRunsTestResults.runId, runId));
        await db.delete(smokeRuns).where(eq(smokeRuns.id, runId));
      }
    });

    it("enforces sequential smoke run numbers per app", async () => {
      const db = getDb();
      const firstRunId = randomUUID();
      const duplicateRunId = randomUUID();

      try {
        await db.insert(smokeRuns).values({
          id: firstRunId,
          runNumber: 90_002,
          appId: "website",
          status: "success",
          trigger: "manual",
          total: 0,
          passed: 0,
          failed: 0,
          checkedAt: new Date("2026-07-08T00:05:00.000Z"),
        });

        await expect(
          db.insert(smokeRuns).values({
            id: duplicateRunId,
            runNumber: 90_002,
            appId: "website",
            status: "failure",
            trigger: "manual",
            total: 0,
            passed: 0,
            failed: 0,
            checkedAt: new Date("2026-07-08T00:06:00.000Z"),
          }),
        ).rejects.toThrow();
      } finally {
        await db
          .delete(smokeRuns)
          .where(eq(smokeRuns.id, duplicateRunId));
        await db.delete(smokeRuns).where(eq(smokeRuns.id, firstRunId));
      }
    });

    it("inserts and queries E2E runs and run steps", async () => {
      const db = getDb();
      const runId = randomUUID();
      const runStepId = randomUUID();

      try {
        await db.insert(e2eRuns).values({
          id: runId,
          runNumber: 90_001,
          profileId: seededProfileId,
          status: "completed",
          startedAt: new Date("2026-07-08T01:00:00.000Z"),
          completedAt: new Date("2026-07-08T01:03:00.000Z"),
        });

        await db.insert(e2eRunSteps).values({
          id: runStepId,
          runId,
          stepId: "new",
          status: "success",
          durationSeconds: 22,
          note: "Integration test step completed.",
        });

        const insertedRun = await db.query.e2eRuns.findFirst({
          where: (e2eRuns, { eq }) => eq(e2eRuns.id, runId),
          with: {
            runSteps: {
              with: {
                e2eStep: true,
              },
            },
          },
        });

        expect(insertedRun?.runSteps).toHaveLength(1);
        expect(insertedRun?.runSteps[0].e2eStep.label).toBe("New");
      } finally {
        await db.delete(e2eRunSteps).where(eq(e2eRunSteps.runId, runId));
        await db.delete(e2eRuns).where(eq(e2eRuns.id, runId));
      }
    });

    it("enforces sequential E2E run numbers per profile", async () => {
      const db = getDb();
      const firstRunId = randomUUID();
      const duplicateRunId = randomUUID();

      try {
        await db.insert(e2eRuns).values({
          id: firstRunId,
          runNumber: 90_002,
          profileId: seededProfileId,
          status: "running",
          startedAt: new Date("2026-07-08T02:00:00.000Z"),
        });

        await expect(
          db.insert(e2eRuns).values({
            id: duplicateRunId,
            runNumber: 90_002,
            profileId: seededProfileId,
            status: "running",
            startedAt: new Date("2026-07-08T02:01:00.000Z"),
          }),
        ).rejects.toThrow();
      } finally {
        await db.delete(e2eRuns).where(eq(e2eRuns.id, duplicateRunId));
        await db.delete(e2eRuns).where(eq(e2eRuns.id, firstRunId));
      }
    });

    it("rejects rows that reference missing parent records", async () => {
      const db = getDb();

      await expect(
        db.insert(smokeRuns).values({
          id: randomUUID(),
          runNumber: 90_003,
          appId: "missing-app",
          status: "failure",
          trigger: "manual",
          total: 0,
          passed: 0,
          failed: 0,
          checkedAt: new Date("2026-07-08T03:00:00.000Z"),
        }),
      ).rejects.toThrow();

      await expect(
        db.insert(e2eRunSteps).values({
          id: randomUUID(),
          runId: randomUUID(),
          stepId: "new",
          status: "queued",
        }),
      ).rejects.toThrow();
    });

    it("keeps seeded app data available after integration setup", async () => {
      const db = getDb();
      const seededApps = await db.select().from(apps);

      expect(seededApps.map((app) => app.id).sort()).toEqual([
        "enrollmate",
        "enrollmate-clp",
        "n8n",
        "website",
      ]);
    });
  });
});
