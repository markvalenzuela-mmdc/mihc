"use client";

import { TestingRouteErrorState } from "@/components/testing-route-error-state";

export default function E2eTestingError({
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
      title="End-to-End Testing"
      subtitle="Review enrollment-ready profiles, start complete test sessions, and trace results from run to assertion."
      dataSourceLabel="End-to-end testing"
    />
  );
}
