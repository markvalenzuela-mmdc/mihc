import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createE2eRunEventStream: vi.fn(),
}));

vi.mock("@/feature/auth/actions/auth.action", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/feature/e2e/services/e2e-run-events.service", () => ({
  createE2eRunEventStream: mocks.createE2eRunEventStream,
}));

import { GET } from "@/app/api/e2e-runs/events/route";

describe("GET /api/e2e-runs/events", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.createE2eRunEventStream.mockReset();
  });

  it("rejects an unauthenticated request before opening a stream", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/e2e-runs/events"),
    );

    expect(response.status).toBe(401);
    expect(mocks.createE2eRunEventStream).not.toHaveBeenCalled();
  });

  it("returns an authenticated uncached event stream", async () => {
    const stream = new ReadableStream<Uint8Array>();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.createE2eRunEventStream.mockReturnValue(stream);
    const request = new Request("http://localhost/api/e2e-runs/events");

    const response = await GET(request);

    expect(mocks.createE2eRunEventStream).toHaveBeenCalledWith(request.signal);
    expect(response.status).toBe(200);
    expect(response.body).toBe(stream);
    expect(response.headers.get("content-type")).toBe(
      "text/event-stream; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe(
      "no-cache, no-transform",
    );
    expect(response.headers.get("connection")).toBe("keep-alive");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
  });
});
