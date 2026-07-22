import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createSmokeRunEventStream: vi.fn(),
}));

vi.mock("@/feature/auth/actions/auth.action", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/feature/smoke/services/smoke-run-events.service", () => ({
  createSmokeRunEventStream: mocks.createSmokeRunEventStream,
}));

import { GET } from "@/app/api/smoke-runs/events/route";

describe("GET /api/smoke-runs/events", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.createSmokeRunEventStream.mockReset();
  });

  it("rejects an unauthenticated request before opening a stream", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/smoke-runs/events"),
    );

    expect(response.status).toBe(401);
    expect(mocks.createSmokeRunEventStream).not.toHaveBeenCalled();
  });

  it("returns an authenticated uncached event stream", async () => {
    const stream = new ReadableStream<Uint8Array>();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.createSmokeRunEventStream.mockReturnValue(stream);
    const request = new Request("http://localhost/api/smoke-runs/events");

    const response = await GET(request);

    expect(mocks.createSmokeRunEventStream).toHaveBeenCalledWith(
      request.signal,
    );
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
