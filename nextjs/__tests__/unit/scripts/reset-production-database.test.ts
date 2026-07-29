import { describe, expect, it, vi } from "vitest";

import { resetDatabaseSchema } from "@/lib/drizzle/reset-schema";
import { releaseDatabase } from "@/scripts/release-database";
import { resetProductionDatabase } from "@/scripts/reset-production-database";

vi.mock("@/lib/drizzle/reset-schema", () => ({
  resetDatabaseSchema: vi.fn(),
}));

vi.mock("@/scripts/release-database", () => ({
  releaseDatabase: vi.fn(),
}));

const environment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:password@database:5432/mihc",
  DATABASE_RESET: "true",
};

describe("resetProductionDatabase", () => {
  it.each(["false", undefined, "TRUE", "1"])(
    "refuses to reset when DATABASE_RESET is %s",
    async (enabled) => {
      const candidate = {
        ...environment,
        DATABASE_RESET: enabled,
      };

      await expect(resetProductionDatabase(candidate)).rejects.toThrow(
        "Set DATABASE_RESET=true.",
      );

      expect(resetDatabaseSchema).not.toHaveBeenCalled();
      expect(releaseDatabase).not.toHaveBeenCalled();
    },
  );

  it("does not run outside the production image environment", async () => {
    await expect(
      resetProductionDatabase({
        ...environment,
        NODE_ENV: "development",
      }),
    ).rejects.toThrow("Production-style reset requires NODE_ENV=production.");

    expect(resetDatabaseSchema).not.toHaveBeenCalled();
    expect(releaseDatabase).not.toHaveBeenCalled();
  });

  it("resets the schema before running the production release", async () => {
    const events: string[] = [];
    vi.mocked(resetDatabaseSchema).mockImplementation(async () => {
      events.push("reset");
    });
    vi.mocked(releaseDatabase).mockImplementation(async () => {
      events.push("release");
    });

    await resetProductionDatabase(environment);

    expect(events).toEqual(["reset", "release"]);
    expect(resetDatabaseSchema).toHaveBeenCalledWith(
      environment.DATABASE_URL,
      expect.any(String),
      { runMigrations: false },
    );
    expect(releaseDatabase).toHaveBeenCalledWith({ environment });
  });
});
