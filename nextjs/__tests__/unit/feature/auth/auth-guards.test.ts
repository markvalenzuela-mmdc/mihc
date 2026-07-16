import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/feature/auth/actions/auth.action", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { requireAuthenticated } from "@/feature/auth/auth-guards";

describe("requireAuthenticated", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.redirect.mockClear();
  });

  it("returns the current user when a session exists", async () => {
    const user = {
      id: "user-1",
      name: "Maintainer",
      email: "maintainer@example.com",
      image: null,
    };
    mocks.getCurrentUser.mockResolvedValue(user);

    await expect(requireAuthenticated()).resolves.toEqual(user);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects to the root route when no session exists", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(requireAuthenticated()).rejects.toThrow("REDIRECT:/");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });
});
