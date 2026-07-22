import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SmokeRunDetailsQueryKey } from "@/feature/smoke/query/smoke-run-details.query";
import { SmokeTestingQueryKey } from "@/feature/smoke/query/smoke-testing.query";

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, Set<EventListener>>();
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: Event) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  close() {
    this.closed = true;
  }
}

vi.stubGlobal("EventSource", FakeEventSource);

import { useSmokeRunEvents } from "@/feature/smoke/hooks/use-smoke-run-events";

describe("useSmokeRunEvents", () => {
  beforeEach(() => {
    FakeEventSource.instances.length = 0;
    mocks.invalidateQueries.mockReset();
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  it("resynchronizes all Smoke state when the stream becomes ready", () => {
    renderHook(() => useSmokeRunEvents());
    const source = FakeEventSource.instances[0];

    act(() => source.emit("ready", new Event("ready")));

    expect(source.url).toBe("/api/smoke-runs/events");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: SmokeTestingQueryKey,
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: SmokeRunDetailsQueryKey,
    });
  });

  it("refreshes the page and invalidates only the changed run details", () => {
    renderHook(() => useSmokeRunEvents());
    const source = FakeEventSource.instances[0];

    act(() =>
      source.emit(
        "smoke-change",
        new MessageEvent("smoke-change", { data: "run-1" }),
      ),
      );

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: SmokeTestingQueryKey,
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [...SmokeRunDetailsQueryKey, "run-1"],
    });
  });

  it("closes the page connection on unmount", () => {
    const { unmount } = renderHook(() => useSmokeRunEvents());
    const source = FakeEventSource.instances[0];

    unmount();

    expect(source.closed).toBe(true);
  });
});
