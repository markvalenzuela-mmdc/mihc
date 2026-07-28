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
    {
      connectError,
      queryErrors = {},
    }: {
      connectError?: Error;
      queryErrors?: Record<number, Error>;
    } = {},
  ) {
    let queryCount = 0;
    const db = {};
    const client = {
      connect: vi.fn(async () => {
        events.push("client:connect");
        if (connectError) throw connectError;
      }),
      query: vi.fn(async (query: string) => {
        queryCount += 1;
        if (query === "SELECT 1") events.push("database:probe");
        if (queryErrors[queryCount]) throw queryErrors[queryCount];
        if (query.startsWith("SET lock_timeout")) events.push("lock:timeout");
        if (query.includes("pg_advisory_lock")) events.push("lock:acquired");
        if (query.includes("pg_advisory_unlock")) events.push("lock:released");
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
      "database:probe",
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
      { connectError: new Error("database unavailable") },
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

  it("retries when connect succeeds but the readiness probe fails", async () => {
    const events: string[] = [];
    const firstConnection = createFakeClient(events, {
      queryErrors: { 1: new Error("probe failed") },
    });
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

    expect(events).toEqual([
      "client:connect",
      "database:probe",
      "client:end",
      "retry:wait",
      "client:connect",
      "database:probe",
      "lock:timeout",
      "lock:acquired",
      "migrate",
      "lock:released",
      "client:end",
    ]);
    expect(firstConnection.client.end).toHaveBeenCalledOnce();
    expect(secondConnection.client.end).toHaveBeenCalledOnce();
  });

  it("fails bounded readiness probes without exposing secrets or leaking clients", async () => {
    const events: string[] = [];
    const connections = Array.from({ length: 2 }, () =>
      createFakeClient(events, {
        queryErrors: {
          1: new Error(`probe failed for ${environment.DATABASE_URL}`),
        },
      }),
    );
    const createClient = vi
      .fn()
      .mockReturnValueOnce(connections[0])
      .mockReturnValueOnce(connections[1]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

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
    expect(connections[0].client.end).toHaveBeenCalledOnce();
    expect(connections[1].client.end).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls.flat().join(" ")).not.toContain(
      environment.DATABASE_URL,
    );
    expect(warn.mock.calls.flat().join(" ")).not.toContain("password");

    warn.mockRestore();
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
      "database:probe",
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
    const connection = createFakeClient(events, {
      queryErrors: { 3: new Error("lock unavailable") },
    });

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
      "database:probe",
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
