import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, signOut } = vi.hoisted(() => ({
  push: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/smoke-testing",
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/better-auth/client", () => ({
  authClient: {
    signOut,
  },
}));

import { AppShell } from "@/components/app-shell";

describe("AppShell account menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the supplied identity and redirects after successful logout", async () => {
    signOut.mockResolvedValueOnce({ data: {}, error: null });

    render(
      <AppShell
        user={{
          name: "Ada Lovelace",
          email: "ada@example.com",
          image: null,
        }}
      >
        <div>Smoke testing content</div>
      </AppShell>,
    );

    expect(screen.getByText("Ada Lovelace")).toBeVisible();
    expect(screen.getByText("ada@example.com")).toBeVisible();
    expect(screen.getByText("AL")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Ada Lovelace/ }));

    const logoutItem = await screen.findByRole("menuitem", { name: "Log out" });
    expect(logoutItem).toBeVisible();

    fireEvent.click(logoutItem);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/");
    });
  });
});
