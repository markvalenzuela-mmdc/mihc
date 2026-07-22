"use client";

import { useSmokeRunEvents } from "../hooks/use-smoke-run-events";

export function SmokeTestingLiveUpdates() {
  useSmokeRunEvents();
  return null;
}
