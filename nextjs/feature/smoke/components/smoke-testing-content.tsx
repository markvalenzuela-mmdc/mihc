"use client";

import { useSearchParams } from "next/navigation";
import { useQuerySmokeTesting } from "../query/smoke-testing.query";
import { SmokeTestingCardsSkeleton } from "./smoke-testing-cards-skeleton";
import { SmokeTestingAppsCard } from "./smoke-testing-cards";
import { SmokeTestingTable } from "./smoke-testing-table";

export function SmokeTestingContent() {
  const searchParams = useSearchParams();
  const query = useQuerySmokeTesting(searchParams.toString());

  if (query.isPending && !query.data) {
    return <SmokeTestingCardsSkeleton />;
  }

  if (query.isError && !query.data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not load Smoke Testing data.
      </p>
    );
  }

  if (!query.data) return null;

  return (
    <>
      <SmokeTestingAppsCard apps={query.data.apps} />
      <SmokeTestingTable
        appName={query.data.appName}
        smokeRuns={query.data.smokeRuns}
      />
    </>
  );
}
