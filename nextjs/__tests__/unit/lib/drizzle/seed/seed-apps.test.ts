import { describe, expect, it, vi } from "vitest";

import {
  SMOKE_TESTING_APPS,
  seedSmokeTestingApps,
} from "@/lib/drizzle/seed/seed-apps";

function createFakeTransaction() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn((_value: unknown) => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));

  return {
    tx: { insert } as never,
    insert,
    values,
    onConflictDoUpdate,
  };
}

describe("seedSmokeTestingApps", () => {
  it("upserts the stable app catalog with the supplied audit owner", async () => {
    const fake = createFakeTransaction();

    await expect(
      seedSmokeTestingApps(fake.tx, "maintainer-id"),
    ).resolves.toEqual([
      "Seeded app: Website",
      "Seeded app: Enrollmate",
      "Seeded app: Enrollmate CLP",
      "Seeded app: Self-hosted n8n",
    ]);

    expect(SMOKE_TESTING_APPS.map(({ id }) => id)).toEqual([
      "website",
      "enrollmate",
      "enrollmate-clp",
      "n8n",
    ]);
    expect(fake.insert).toHaveBeenCalledTimes(4);
    expect(fake.values.mock.calls.map(([value]) => value)).toEqual(
      SMOKE_TESTING_APPS.map((app) => ({
        ...app,
        createdBy: "maintainer-id",
        updatedBy: "maintainer-id",
      })),
    );
    expect(fake.onConflictDoUpdate).toHaveBeenCalledTimes(4);
  });
});
