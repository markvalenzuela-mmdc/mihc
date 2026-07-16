import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getSmokeTestTarget: vi.fn(),
  inngestSend: vi.fn(),
}));

vi.mock("@/feature/auth/actions/auth.action", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/feature/smoke/config/smoke-test-targets.config", () => ({
  getSmokeTestTarget: mocks.getSmokeTestTarget,
}));
vi.mock("@/lib/inngest/client", () => ({
  SMOKE_TEST_REQUESTED: "smoke-test/requested",
  inngest: {
    send: mocks.inngestSend,
  },
}));

import { requestSmokeTest } from "@/feature/smoke/actions/request-smoke-test.action";

describe("requestSmokeTest", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.getSmokeTestTarget.mockReset();
    mocks.inngestSend.mockReset();
  });

  it("publishes the authenticated user ID with a smoke request", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getSmokeTestTarget.mockReturnValue({
      appId: "website",
      suite: "smoke",
    });
    mocks.inngestSend.mockResolvedValue(undefined);

    await expect(requestSmokeTest("website")).resolves.toEqual({
      ok: true,
      data: { correlationId: expect.any(String) },
    });

    expect(mocks.inngestSend).toHaveBeenCalledWith({
      name: "smoke-test/requested",
      data: {
        appId: "website",
        suite: "smoke",
        trigger: "manual",
        correlationId: expect.any(String),
        requestedBy: "user-1",
        requestedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
    });
  });

  it("rejects unauthenticated requests without publishing an event", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(requestSmokeTest("website")).resolves.toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(mocks.inngestSend).not.toHaveBeenCalled();
  });
});
