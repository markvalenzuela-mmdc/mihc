import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2eProfileRunsQueryKey,
  E2eProfileWorkspaceQueryKey,
  E2eRunDetailsQueryKey,
} from "@/feature/e2e/query/e2e-profile-workspace.query";

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

import { useE2eRunEvents } from "@/feature/e2e/hooks/use-e2e-run-events";

describe("useE2eRunEvents", () => {
  beforeEach(() => {
    FakeEventSource.instances.length = 0;
    mocks.invalidateQueries.mockReset();
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  it("resynchronizes all E2E state when the stream becomes ready", () => {
    renderHook(() => useE2eRunEvents());
    const source = FakeEventSource.instances[0];

    act(() => source.emit("ready", new Event("ready")));

    expect(source.url).toBe("/api/e2e-runs/events");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: E2eProfileWorkspaceQueryKey,
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: E2eProfileRunsQueryKey,
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: E2eRunDetailsQueryKey,
    });
  });

  it("invalidates only the affected profile and run", () => {
    renderHook(() => useE2eRunEvents());
    const source = FakeEventSource.instances[0];

    act(() =>
      source.emit(
        "e2e-change",
        new MessageEvent("e2e-change", {
          data: JSON.stringify({ profileId: "profile-1", runId: "run-1" }),
        }),
      ),
    );

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [...E2eProfileWorkspaceQueryKey, "profile-1"],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [...E2eProfileRunsQueryKey, "profile-1"],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [...E2eRunDetailsQueryKey, "profile-1", "run-1"],
    });
  });

  it("ignores malformed or incomplete events", () => {
    renderHook(() => useE2eRunEvents());
    const source = FakeEventSource.instances[0];

    act(() => {
      source.emit(
        "e2e-change",
        new MessageEvent("e2e-change", { data: "not-json" }),
      );
      source.emit(
        "e2e-change",
        new MessageEvent("e2e-change", {
          data: JSON.stringify({ profileId: "profile-1" }),
        }),
      );
    });

    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it("closes the page connection on unmount", () => {
    const { unmount } = renderHook(() => useE2eRunEvents());
    const source = FakeEventSource.instances[0];

    unmount();

    expect(source.closed).toBe(true);
  });
});
