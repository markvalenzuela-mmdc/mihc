import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  inngestSend: vi.fn(),
}));

vi.mock("@/feature/auth/actions/auth.action", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/inngest/client", () => ({
  E2E_TEST_REQUESTED: "e2e-test/requested",
  inngest: {
    send: mocks.inngestSend,
  },
}));

import { requestE2eTest } from "@/feature/e2e/actions/request-e2e-test.action";

describe("requestE2eTest", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.inngestSend.mockReset();
  });

  it("rejects unauthenticated requests without publishing an event", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(
      requestE2eTest({ profileId: "profile-1", stepIds: ["new"] }),
    ).resolves.toEqual({ ok: false, error: "forbidden" });
    expect(mocks.inngestSend).not.toHaveBeenCalled();
  });

  it("publishes the profile, selected steps, and authenticated user", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.inngestSend.mockResolvedValue(undefined);

    await expect(
      requestE2eTest({ profileId: "profile-1", stepIds: ["new"] }),
    ).resolves.toEqual({
      ok: true,
      data: { correlationId: expect.any(String) },
    });

    expect(mocks.inngestSend).toHaveBeenCalledWith({
      name: "e2e-test/requested",
      data: {
        profileId: "profile-1",
        stepIds: ["new"],
        requestedBy: "user-1",
        correlationId: expect.any(String),
        requestedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
    });
  });

  it("rejects empty profile or step IDs", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });

    await expect(
      requestE2eTest({ profileId: " ", stepIds: ["new"] }),
    ).resolves.toEqual({
      ok: false,
      error: "A profile and at least one E2E step are required.",
    });
    await expect(
      requestE2eTest({ profileId: "profile-1", stepIds: [" "] }),
    ).resolves.toEqual({
      ok: false,
      error: "A profile and at least one E2E step are required.",
    });
    expect(mocks.inngestSend).not.toHaveBeenCalled();
  });

  it("returns the E2E enqueue error when publishing fails", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.inngestSend.mockRejectedValue(new Error("Inngest unavailable"));

    await expect(
      requestE2eTest({ profileId: "profile-1", stepIds: ["new"] }),
    ).resolves.toEqual({
      ok: false,
      error: "Failed to enqueue E2E test. Please try again.",
    });
  });
});
