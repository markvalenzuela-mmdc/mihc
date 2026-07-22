"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  SMOKE_POLL_INTERVAL_MS,
  SMOKE_RUN_START_TIMEOUT_MS,
} from "../config/smoke-polling.config";

export function useSmokeRunPolling(hasActiveRun: boolean) {
  const router = useRouter();
  const [isAwaitingRun, setIsAwaitingRun] = useState(false);

  useEffect(() => {
    if (!hasActiveRun && !isAwaitingRun) return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, SMOKE_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [hasActiveRun, isAwaitingRun, router]);

  useEffect(() => {
    if (!isAwaitingRun) return;

    const timeout = window.setTimeout(() => {
      setIsAwaitingRun(false);
    }, hasActiveRun ? 0 : SMOKE_RUN_START_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [hasActiveRun, isAwaitingRun]);

  const startAwaitingRun = useCallback(() => {
    setIsAwaitingRun(true);
  }, []);

  return { startAwaitingRun };
}
