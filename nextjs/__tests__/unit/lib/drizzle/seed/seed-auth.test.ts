import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
}));

vi.mock("@/lib/better-auth/auth", () => ({
  auth: { api: { signUpEmail: mocks.signUpEmail } },
}));

import {
  developmentAuthUser,
  seedAuthUser,
} from "@/lib/drizzle/seed/seed-auth";

function fakeDb(rows: Array<{ id: string }>) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));

  return {
    select: vi.fn(() => ({ from })),
  } as never;
}

describe("seedAuthUser", () => {
  beforeEach(() => {
    mocks.signUpEmail.mockReset();
    vi.unstubAllEnvs();
  });

  it("creates the local BetterAuth user when the email is absent", async () => {
    mocks.signUpEmail.mockResolvedValue({
      user: { email: developmentAuthUser.email },
    });

    await expect(seedAuthUser(fakeDb([]))).resolves.toEqual([
      `Seeded auth user: ${developmentAuthUser.email}`,
      `Development login password: ${developmentAuthUser.password}`,
    ]);

    expect(mocks.signUpEmail).toHaveBeenCalledWith({
      body: developmentAuthUser,
      headers: expect.any(Headers),
    });
  });

  it("does not call BetterAuth when the email already exists", async () => {
    await expect(
      seedAuthUser(fakeDb([{ id: "existing-user" }])),
    ).resolves.toEqual([
      `Auth user already exists: ${developmentAuthUser.email}`,
      `Development login password: ${developmentAuthUser.password}`,
    ]);

    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("skips the development credential in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(seedAuthUser(fakeDb([]))).resolves.toEqual([
      "Skipped development auth user seed in production.",
    ]);

    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });
});
