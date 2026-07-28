import { describe, expect, it, vi } from "vitest";

import { seedProductionDatabase } from "@/lib/drizzle/seed/seed-production";

const config = {
  name: "Production Maintainer",
  email: "maintainer@example.com",
  password: "safe-password-123",
};

function createExistingMaintainerDatabase(
  credentialAccounts: Array<{
    accountId: string;
    password: string | null;
  }>,
) {
  const limit = vi.fn().mockResolvedValue([{ id: "maintainer-id" }]);
  const userWhere = vi.fn(() => ({ limit }));
  const accountWhere = vi.fn().mockResolvedValue(credentialAccounts);
  const from = vi
    .fn()
    .mockReturnValueOnce({ where: userWhere })
    .mockReturnValueOnce({ where: accountWhere });
  const select = vi.fn(() => ({ from }));
  const transaction = vi.fn();

  return {
    db: { select, transaction } as never,
    transaction,
  };
}

describe("seedProductionDatabase", () => {
  it.each([
    {
      name: "missing credential account",
      credentialAccounts: [],
    },
    {
      name: "credential account without a password",
      credentialAccounts: [
        { accountId: "maintainer-id", password: null },
      ],
    },
    {
      name: "noncanonical credential account",
      credentialAccounts: [
        { accountId: "other-account-id", password: "stored-password-hash" },
      ],
    },
    {
      name: "duplicate credential accounts",
      credentialAccounts: [
        { accountId: "maintainer-id", password: "stored-password-hash" },
        { accountId: "maintainer-id", password: "second-password-hash" },
      ],
    },
  ])("rejects an existing maintainer with $name", async ({ credentialAccounts }) => {
    const fake = createExistingMaintainerDatabase(credentialAccounts);

    await expect(seedProductionDatabase(fake.db, config)).rejects.toThrow(
      "supported Better Auth password or account recovery flow",
    );
    expect(fake.transaction).not.toHaveBeenCalled();
  });
});
