import { describe, expect, it, vi } from "vitest";

import { releaseDatabase } from "@/scripts/release-database";

const environment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:password@database:5432/mihc",
  BETTER_AUTH_URL: "https://sanity.example.com",
  PROD_MAINTAINER_NAME: "Production Maintainer",
  PROD_MAINTAINER_EMAIL: "maintainer@example.com",
  PROD_MAINTAINER_PASSWORD: "safe-password-123",
};

describe("releaseDatabase", () => {
  function createFakeClient(events: string[]) {
    return {
      db: {},
      pool: {
        end: vi.fn(async () => {
          events.push("pool:end");
        }),
      },
    };
  }

  it("migrates, seeds, and closes the pool in order", async () => {
    const events: string[] = [];
    const connection = createFakeClient(events);

    await releaseDatabase({
      environment,
      createClient: () => connection as never,
      migrateDatabase: async () => {
        events.push("migrate");
      },
      seedDatabase: async () => {
        events.push("seed");
        return [];
      },
    });

    expect(events).toEqual(["migrate", "seed", "pool:end"]);
  });

  it("rejects non-production execution before opening a database", async () => {
    const createClient = vi.fn();

    await expect(
      releaseDatabase({
        environment: { NODE_ENV: "development" },
        createClient,
      }),
    ).rejects.toThrow("Database release requires NODE_ENV=production.");

    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects a missing database URL before opening a database", async () => {
    const createClient = vi.fn();

    await expect(
      releaseDatabase({
        environment: { NODE_ENV: "production" },
        createClient,
      }),
    ).rejects.toThrow("DATABASE_URL is required for database release.");

    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not seed and closes the pool when migration fails", async () => {
    const events: string[] = [];
    const connection = createFakeClient(events);
    const seedDatabase = vi.fn(async () => []);

    await expect(
      releaseDatabase({
        environment,
        createClient: () => connection as never,
        migrateDatabase: async () => {
          events.push("migrate");
          throw new Error("migration failed");
        },
        seedDatabase,
      }),
    ).rejects.toThrow("migration failed");

    expect(seedDatabase).not.toHaveBeenCalled();
    expect(connection.pool.end).toHaveBeenCalledOnce();
    expect(events).toEqual(["migrate", "pool:end"]);
  });

  it("closes the pool when seeding fails", async () => {
    const events: string[] = [];
    const connection = createFakeClient(events);

    await expect(
      releaseDatabase({
        environment,
        createClient: () => connection as never,
        migrateDatabase: async () => {
          events.push("migrate");
        },
        seedDatabase: async () => {
          events.push("seed");
          throw new Error("seed failed");
        },
      }),
    ).rejects.toThrow("seed failed");

    expect(connection.pool.end).toHaveBeenCalledOnce();
    expect(events).toEqual(["migrate", "seed", "pool:end"]);
  });
});
