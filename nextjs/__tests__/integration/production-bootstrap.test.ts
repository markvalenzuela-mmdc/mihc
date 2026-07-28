import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { closeDb, getDb } from "@/lib/drizzle/db";
import {
  apps,
  authUser,
  e2eSteps,
  profiles,
  smokeRuns,
} from "@/lib/drizzle/schema";
import { seedProductionDatabase } from "@/lib/drizzle/seed/seed-production";
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
    const [smokeRunCount] = await db.select({ value: count() }).from(smokeRuns);
    const [profileCount] = await db.select({ value: count() }).from(profiles);
    const [e2eStepCount] = await db.select({ value: count() }).from(e2eSteps);

    expect(userCount.value).toBe(1);
    expect(seededMaintainer.emailVerified).toBe(true);
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

  it("updates identity fields without duplicating the user or resetting its password", async () => {
    await seedProductionDatabase(getDb(), {
      ...maintainer,
      name: "Renamed Production Maintainer",
      password: "different-password-456",
    });

    const db = getDb();
    const matchingUsers = await db
      .select({ name: authUser.name })
      .from(authUser)
      .where(eq(authUser.email, maintainer.email));
    const { auth } = await import("@/lib/better-auth/auth");

    expect(matchingUsers).toEqual([{ name: "Renamed Production Maintainer" }]);
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
});
