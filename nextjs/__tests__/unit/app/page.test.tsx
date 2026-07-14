import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  LoginForm: vi.fn(() => null),
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

vi.mock("@/app/_components/login-form", () => ({
  LoginForm: mocks.LoginForm,
}));

import Home from "@/app/page";

describe("Home page", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.redirect.mockClear();
    mocks.LoginForm.mockClear();
  });

  it("renders the login form when no session exists", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const page = await Home();

    expect(page).toEqual(expect.objectContaining({ type: mocks.LoginForm }));
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects authenticated users to smoke testing", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      name: "Maintainer",
      email: "maintainer@example.com",
      image: null,
    });

    await expect(Home()).rejects.toThrow("REDIRECT:/smoke-testing");
    expect(mocks.redirect).toHaveBeenCalledWith("/smoke-testing");
  });
});
