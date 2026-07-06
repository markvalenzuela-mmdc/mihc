"use client";

import { TestingRouteErrorState } from "@/components/testing-route-error-state";

export default function SmokeTestingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <TestingRouteErrorState
      error={error}
      unstable_retry={unstable_retry}
      title="Smoke Testing"
      subtitle="Monitor the latest application state, compare recent runs, and inspect individual test diagnostics."
      dataSourceLabel="Smoke testing"
    />
  );
}
