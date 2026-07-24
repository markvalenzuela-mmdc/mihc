"use client";

import { useE2eRunEvents } from "../hooks/use-e2e-run-events";

export function E2eTestingLiveUpdates() {
  useE2eRunEvents();
  return null;
}
