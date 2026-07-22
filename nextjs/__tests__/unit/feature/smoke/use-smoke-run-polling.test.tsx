import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SMOKE_POLL_INTERVAL_MS, SMOKE_RUN_START_TIMEOUT_MS } from "@/feature/smoke/config/smoke-polling.config";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { useSmokeRunPolling } from "@/feature/smoke/hooks/use-smoke-run-polling";

describe("useSmokeRunPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes while a database-backed active run exists", () => {
    const { rerender } = renderHook(
      ({ active }) => useSmokeRunPolling(active),
      { initialProps: { active: true } },
    );

    act(() => vi.advanceTimersByTime(SMOKE_POLL_INTERVAL_MS * 2));
    expect(refresh).toHaveBeenCalledTimes(2);

    rerender({ active: false });
    act(() => vi.advanceTimersByTime(SMOKE_POLL_INTERVAL_MS));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("starts polling after enqueue and hands off to active-run polling", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useSmokeRunPolling(active),
      { initialProps: { active: false } },
    );

    act(() => vi.advanceTimersByTime(SMOKE_POLL_INTERVAL_MS));
    expect(refresh).not.toHaveBeenCalled();

    act(() => result.current.startAwaitingRun());
    act(() => vi.advanceTimersByTime(SMOKE_POLL_INTERVAL_MS));
    expect(refresh).toHaveBeenCalledTimes(1);

    rerender({ active: true });
    act(() => vi.advanceTimersByTime(SMOKE_POLL_INTERVAL_MS));
    expect(refresh).toHaveBeenCalledTimes(2);

    rerender({ active: false });
    act(() => vi.advanceTimersByTime(SMOKE_POLL_INTERVAL_MS));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("stops waiting when an enqueued run does not appear", () => {
    const { result } = renderHook(() => useSmokeRunPolling(false));

    act(() => result.current.startAwaitingRun());
    act(() => vi.advanceTimersByTime(SMOKE_RUN_START_TIMEOUT_MS));
    const callsAtTimeout = refresh.mock.calls.length;

    act(() => vi.advanceTimersByTime(SMOKE_POLL_INTERVAL_MS));
    expect(refresh).toHaveBeenCalledTimes(callsAtTimeout);
  });
});
