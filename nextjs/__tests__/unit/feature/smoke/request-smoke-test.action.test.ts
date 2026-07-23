import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getSmokeTestTarget: vi.fn(),
  createQueuedSmokeRun: vi.fn(),
  failQueuedSmokeRun: vi.fn(),
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
vi.mock("@/feature/smoke/services/enqueue-smoke-run.service", () => ({
  createQueuedSmokeRun: mocks.createQueuedSmokeRun,
  failQueuedSmokeRun: mocks.failQueuedSmokeRun,
}));

import { requestSmokeTest } from "@/feature/smoke/actions/request-smoke-test.action";

describe("requestSmokeTest", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.getSmokeTestTarget.mockReset();
    mocks.createQueuedSmokeRun.mockReset();
    mocks.failQueuedSmokeRun.mockReset();
    mocks.inngestSend.mockReset();
  });

  it("publishes the authenticated user ID with a smoke request", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getSmokeTestTarget.mockReturnValue({
      appId: "website",
      suite: "smoke",
    });
    mocks.createQueuedSmokeRun.mockResolvedValue({ runId: "run-1", runNumber: 7 });
    mocks.inngestSend.mockResolvedValue(undefined);

    await expect(requestSmokeTest("website")).resolves.toEqual({
      ok: true,
      data: { correlationId: expect.any(String) },
    });

    expect(mocks.inngestSend).toHaveBeenCalledWith({
      name: "smoke-test/requested",
      data: {
        runId: "run-1",
        appId: "website",
        suite: "smoke",
        trigger: "manual",
        correlationId: expect.any(String),
        requestedBy: "user-1",
        requestedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
    });
    expect(mocks.createQueuedSmokeRun.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.inngestSend.mock.invocationCallOrder[0],
    );
  });

  it("marks a queued run failed when event publication fails", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getSmokeTestTarget.mockReturnValue({
      appId: "website",
      suite: "smoke",
    });
    mocks.createQueuedSmokeRun.mockResolvedValue({ runId: "run-1", runNumber: 7 });
    mocks.inngestSend.mockRejectedValue(new Error("Inngest unavailable"));
    mocks.failQueuedSmokeRun.mockResolvedValue(true);

    await expect(requestSmokeTest("website")).resolves.toEqual({
      ok: false,
      error: "Failed to enqueue smoke test. Please try again.",
    });

    expect(mocks.failQueuedSmokeRun).toHaveBeenCalledWith({
      runId: "run-1",
      completedAt: expect.any(Date),
    });
  });

  it("rejects unauthenticated requests without publishing an event", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(requestSmokeTest("website")).resolves.toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(mocks.createQueuedSmokeRun).not.toHaveBeenCalled();
    expect(mocks.inngestSend).not.toHaveBeenCalled();
  });
});
