import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { closeDb, getDb } from "@/lib/drizzle/db";
import {
  apps,
  authAccount,
  authUser,
  e2eSteps,
  profiles,
  smokeRuns,
  smokeRunsTestResults,
} from "@/lib/drizzle/schema";
import { seedProductionDatabase } from "@/lib/drizzle/seed/seed-production";
import { releaseDatabase } from "@/scripts/release-database";
import { setupTestDatabase } from "@/scripts/setup-test-db";

const maintainer = {
  name: "Production Maintainer",
  email: "production-maintainer@example.com",
  password: "safe-password-123",
};

describe("production database bootstrap", () => {
  let originalDatabaseUrl: string | undefined;

  beforeAll(async () => {
    const testDatabaseUrl = process.env.TEST_DATABASE_URL;
    if (!testDatabaseUrl) {
      throw new Error("TEST_DATABASE_URL is required for integration tests.");
    }

    originalDatabaseUrl = process.env.DATABASE_URL;
    await setupTestDatabase({ seed: false });
    process.env.DATABASE_URL = testDatabaseUrl;
  }, 120_000);

  afterAll(async () => {
    await closeDb();

    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }

    vi.unstubAllEnvs();
  });

  it("seeds only the maintainer and Smoke Testing app catalog", async () => {
    const messages = await seedProductionDatabase(getDb(), maintainer);

    const db = getDb();
    const [userCount] = await db.select({ value: count() }).from(authUser);
    const seededApps = await db
      .select({
        id: apps.id,
        createdBy: apps.createdBy,
        updatedBy: apps.updatedBy,
      })
      .from(apps)
      .orderBy(apps.id);
    const [seededMaintainer] = await db
      .select({ id: authUser.id, emailVerified: authUser.emailVerified })
      .from(authUser)
      .where(eq(authUser.email, maintainer.email));
    const credentialAccounts = await db
      .select({
        accountId: authAccount.accountId,
        password: authAccount.password,
      })
      .from(authAccount)
      .where(eq(authAccount.userId, seededMaintainer.id));
    const [smokeRunCount] = await db.select({ value: count() }).from(smokeRuns);
    const [profileCount] = await db.select({ value: count() }).from(profiles);
    const [e2eStepCount] = await db.select({ value: count() }).from(e2eSteps);

    expect(userCount.value).toBe(1);
    expect(seededMaintainer.emailVerified).toBe(true);
    expect(credentialAccounts).toHaveLength(1);
    expect(credentialAccounts[0]).toMatchObject({
      accountId: seededMaintainer.id,
      password: expect.any(String),
    });
    expect(seededApps).toEqual([
      {
        id: "enrollmate",
        createdBy: seededMaintainer.id,
        updatedBy: seededMaintainer.id,
      },
      {
        id: "enrollmate-clp",
        createdBy: seededMaintainer.id,
        updatedBy: seededMaintainer.id,
      },
      {
        id: "n8n",
        createdBy: seededMaintainer.id,
        updatedBy: seededMaintainer.id,
      },
      {
        id: "website",
        createdBy: seededMaintainer.id,
        updatedBy: seededMaintainer.id,
      },
    ]);
    expect(smokeRunCount.value).toBe(0);
    expect(profileCount.value).toBe(0);
    expect(e2eStepCount.value).toBe(0);
    expect(messages.join("\n")).not.toContain(maintainer.password);
  });

  it("preserves operational rows while reconciling identity without resetting the password", async () => {
    const db = getDb();
    const [seededMaintainer] = await db
      .select({ id: authUser.id })
      .from(authUser)
      .where(eq(authUser.email, maintainer.email));
    const checkedAt = new Date("2026-07-28T00:00:00.000Z");
    const [operationalRun] = await db
      .insert(smokeRuns)
      .values({
        runNumber: 1,
        appId: "website",
        status: "success",
        trigger: "manual",
        total: 1,
        passed: 1,
        failed: 0,
        startedBy: seededMaintainer.id,
        checkedAt,
      })
      .returning({ id: smokeRuns.id });
    const [operationalResult] = await db
      .insert(smokeRunsTestResults)
      .values({
        runId: operationalRun.id,
        testId: "production-preservation-check",
        testName: "Production preservation check",
        status: "success",
      })
      .returning({ id: smokeRunsTestResults.id });

    await seedProductionDatabase(getDb(), {
      ...maintainer,
      name: "Renamed Production Maintainer",
      password: "different-password-456",
    });

    const matchingUsers = await db
      .select({ name: authUser.name })
      .from(authUser)
      .where(eq(authUser.email, maintainer.email));
    const preservedRuns = await db
      .select({
        id: smokeRuns.id,
        status: smokeRuns.status,
        total: smokeRuns.total,
        passed: smokeRuns.passed,
      })
      .from(smokeRuns)
      .where(eq(smokeRuns.id, operationalRun.id));
    const preservedResults = await db
      .select({
        id: smokeRunsTestResults.id,
        testName: smokeRunsTestResults.testName,
        status: smokeRunsTestResults.status,
      })
      .from(smokeRunsTestResults)
      .where(eq(smokeRunsTestResults.id, operationalResult.id));
    const { auth } = await import("@/lib/better-auth/auth");

    expect(matchingUsers).toEqual([{ name: "Renamed Production Maintainer" }]);
    expect(preservedRuns).toEqual([
      {
        id: operationalRun.id,
        status: "success",
        total: 1,
        passed: 1,
      },
    ]);
    expect(preservedResults).toEqual([
      {
        id: operationalResult.id,
        testName: "Production preservation check",
        status: "success",
      },
    ]);
    await expect(
      auth.api.signInEmail({
        body: { email: maintainer.email, password: maintainer.password },
        headers: new Headers({ host: "localhost" }),
      }),
    ).resolves.toMatchObject({ user: { email: maintainer.email } });
    await expect(
      auth.api.signInEmail({
        body: {
          email: maintainer.email,
          password: "different-password-456",
        },
        headers: new Headers({ host: "localhost" }),
      }),
    ).rejects.toThrow();
  });

  it("rejects an existing maintainer without a usable credential account before writes", async () => {
    const db = getDb();
    const partialMaintainer = {
      ...maintainer,
      name: "Partial Maintainer",
      email: "partial-maintainer@example.com",
    };

    const [partialUser] = await db
      .insert(authUser)
      .values({
        name: "Existing Partial User",
        email: partialMaintainer.email,
        emailVerified: false,
      })
      .returning({ id: authUser.id });

    await expect(
      seedProductionDatabase(db, partialMaintainer),
    ).rejects.toThrow(
      "supported Better Auth password or account recovery flow",
    );

    const [unchangedUser] = await db
      .select({
        name: authUser.name,
        emailVerified: authUser.emailVerified,
      })
      .from(authUser)
      .where(eq(authUser.id, partialUser.id));
    const partialUserApps = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.updatedBy, partialUser.id));

    expect(unchangedUser).toEqual({
      name: "Existing Partial User",
      emailVerified: false,
    });
    expect(partialUserApps).toEqual([]);
  });

  it("serializes concurrent releases with the PostgreSQL advisory lock", async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("TEST_DATABASE_URL is required for integration tests.");
    }

    const events: string[] = [];
    let allowFirstRelease: (() => void) | undefined;
    let markFirstStarted: (() => void) | undefined;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const firstCanFinish = new Promise<void>((resolve) => {
      allowFirstRelease = resolve;
    });
    const releaseEnvironment = {
      NODE_ENV: "production",
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_URL: "https://sanity.example.com",
      PROD_MAINTAINER_NAME: "Production Maintainer",
      PROD_MAINTAINER_EMAIL: "maintainer@example.com",
      PROD_MAINTAINER_PASSWORD: "safe-password-123",
    };

    const first = releaseDatabase({
      environment: releaseEnvironment,
      connectionAttempts: 1,
      migrateDatabase: async () => {
        events.push("first:migrate");
        markFirstStarted?.();
        await firstCanFinish;
      },
      seedDatabase: async () => {
        events.push("first:seed");
        return [];
      },
    });
    await firstStarted;

    const second = releaseDatabase({
      environment: releaseEnvironment,
      connectionAttempts: 1,
      migrateDatabase: async () => {
        events.push("second:migrate");
      },
      seedDatabase: async () => {
        events.push("second:seed");
        return [];
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(events).toEqual(["first:migrate"]);

    allowFirstRelease?.();
    await Promise.all([first, second]);

    expect(events).toEqual([
      "first:migrate",
      "first:seed",
      "second:migrate",
      "second:seed",
    ]);
  }, 30_000);
});
