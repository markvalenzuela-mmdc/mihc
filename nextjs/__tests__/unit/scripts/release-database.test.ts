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
  it("validates, migrates, seeds, and closes in order", async () => {
    const events: string[] = [];
    const pool = {
      end: vi.fn(async () => {
        events.push("pool:end");
      }),
    };
    const db = {};

    await releaseDatabase({
      environment,
      createClient: () => ({ db, pool }) as never,
      migrateDatabase: async () => {
        events.push("migrate");
      },
      seedDatabase: async (_db, config) => {
        expect(config.email).toBe("maintainer@example.com");
        events.push("seed");
        return [];
      },
      closeAuthDatabase: async () => {
        events.push("auth:end");
      },
    });

    expect(events).toEqual(["migrate", "seed", "pool:end", "auth:end"]);
  });

  it("rejects non-production execution before opening a database", async () => {
    const createClient = vi.fn();

    await expect(
      releaseDatabase({
        environment: { ...environment, NODE_ENV: "development" },
        createClient,
      }),
    ).rejects.toThrow("NODE_ENV=production");

    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects a missing database URL before opening a database", async () => {
    const createClient = vi.fn();

    await expect(
      releaseDatabase({
        environment: { ...environment, DATABASE_URL: undefined },
        createClient,
      }),
    ).rejects.toThrow("DATABASE_URL is required");

    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects missing configuration before opening a database", async () => {
    const createClient = vi.fn();

    await expect(
      releaseDatabase({
        environment: {
          ...environment,
          PROD_MAINTAINER_PASSWORD: undefined,
        },
        createClient,
      }),
    ).rejects.toThrow();

    expect(createClient).not.toHaveBeenCalled();
  });
});
