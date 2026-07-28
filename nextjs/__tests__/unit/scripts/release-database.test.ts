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
  function createFakeClient(
    events: string[],
    connectError?: Error,
    queryErrorAt?: number,
  ) {
    let queryCount = 0;
    const db = {};
    const client = {
      connect: vi.fn(async () => {
        events.push("client:connect");
        if (connectError) throw connectError;
      }),
      query: vi.fn(async () => {
        queryCount += 1;
        if (queryCount === queryErrorAt) {
          throw new Error("lock unavailable");
        }
        if (queryCount === 1) events.push("lock:timeout");
        if (queryCount === 2) events.push("lock:acquired");
        if (queryCount === 3) events.push("lock:released");
      }),
      end: vi.fn(async () => {
        events.push("client:end");
      }),
    };

    return { client, db };
  }

  it("connects, locks, migrates, seeds, and closes in order", async () => {
    const events: string[] = [];
    const connection = createFakeClient(events);

    await releaseDatabase({
      environment,
      createClient: () => connection as never,
      migrateDatabase: async () => {
        events.push("migrate");
      },
      seedDatabase: async (_db, config) => {
        expect(config.email).toBe("maintainer@example.com");
        events.push("seed");
        return [];
      },
    });

    expect(events).toEqual([
      "client:connect",
      "lock:timeout",
      "lock:acquired",
      "migrate",
      "seed",
      "lock:released",
      "client:end",
    ]);
  });

  it("retries database readiness before migrations begin", async () => {
    const events: string[] = [];
    const firstConnection = createFakeClient(
      events,
      new Error("database unavailable"),
    );
    const secondConnection = createFakeClient(events);
    const createClient = vi
      .fn()
      .mockReturnValueOnce(firstConnection)
      .mockReturnValueOnce(secondConnection);

    await releaseDatabase({
      environment,
      createClient,
      connectionAttempts: 2,
      connectionRetryMs: 10,
      sleep: async () => {
        events.push("retry:wait");
      },
      migrateDatabase: async () => {
        events.push("migrate");
      },
      seedDatabase: async () => [],
    });

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(events.indexOf("migrate")).toBeGreaterThan(
      events.lastIndexOf("client:connect"),
    );
    expect(events).toContain("retry:wait");
    expect(firstConnection.client.end).toHaveBeenCalledOnce();
    expect(secondConnection.client.end).toHaveBeenCalledOnce();
  });

  it("fails readiness after a bounded number of attempts without exposing secrets", async () => {
    const events: string[] = [];
    const createClient = vi.fn(() =>
      createFakeClient(events, new Error(`failed for ${environment.DATABASE_URL}`)),
    );

    const release = releaseDatabase({
      environment,
      createClient: createClient as never,
      connectionAttempts: 2,
      connectionRetryMs: 10,
      sleep: async () => undefined,
    });

    await expect(release).rejects.toThrow(
      "Unable to connect to PostgreSQL for database release after 2 attempts",
    );
    await expect(release).rejects.not.toThrow("password");
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it("releases the advisory lock and closes the client on failure", async () => {
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
          events.push("seed:failed");
          throw new Error("bootstrap failed");
        },
      }),
    ).rejects.toThrow("bootstrap failed");

    expect(events).toEqual([
      "client:connect",
      "lock:timeout",
      "lock:acquired",
      "migrate",
      "seed:failed",
      "lock:released",
      "client:end",
    ]);
  });

  it("stops before migrations when the advisory lock cannot be acquired", async () => {
    const events: string[] = [];
    const connection = createFakeClient(events, undefined, 2);

    await expect(
      releaseDatabase({
        environment,
        createClient: () => connection as never,
        migrateDatabase: async () => {
          events.push("migrate");
        },
      }),
    ).rejects.toThrow(
      "Unable to acquire the database release lock within 5 minutes",
    );

    expect(events).toEqual([
      "client:connect",
      "lock:timeout",
      "client:end",
    ]);
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
