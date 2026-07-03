import { AppShell } from "@/components/app-shell";
import { MainShell } from "@/components/main-shell";
import { getSmokeTestApps } from "@/feature/smoke/services/smoke-test-apps.service";
import { SmokeTestingAppsCard } from "@/feature/smoke/components/smoke-testing-cards";
import { SearchParams } from "nuqs";
import { cache } from "react";
import Suspenser from "@/components/blocks/Suspenser/suspenser";
import { SmokeTestingCardsSkeleton } from "@/feature/smoke/components/smoke-testing-cards-skeleton";
import { SmokeTestingTable } from "@/feature/smoke/components/smoke-testing-table";
import {
  loadLimitSearchParams,
  loadPaginationSearchParams,
  loadTabFilterSearchParams,
} from "@/components/blocks/DataTable/data-table-query-state";
import { getPaginatedSmokeTestRuns } from "@/feature/smoke/services/smoke-test-runs.service";
import { loadAppSearchParams } from "@/feature/smoke/components/smoke-testing.query-state";
import SmokeRunDetailsSheet from "@/feature/smoke/components/smoke-run-details-sheet";
import { SmokeTestRunStatus } from "@/feature/smoke/types/smoke-test-apps.types";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

const getData = cache(async (searchParams: Promise<SearchParams>) => {
  const { limit: limitValue } = await loadLimitSearchParams(searchParams);
  const { tab } = await loadTabFilterSearchParams(searchParams);
  const { page } = await loadPaginationSearchParams(searchParams);
  const { app } = await loadAppSearchParams(searchParams);

  const limit = Math.min(Math.max(1, limitValue ?? 5), 100); // Ensure limit is between 1 and 100

  const apps = await getSmokeTestApps();

  const smokeRuns = await getPaginatedSmokeTestRuns({
    appId: app,
    limit,
    page,
    tab: SmokeTestRunStatus.includes(tab as SmokeTestRunStatus)
      ? (tab as SmokeTestRunStatus)
      : undefined,
  });

  return {
    appName: apps.find((a) => a.id === app)?.name ?? null,
    apps,
    smokeRuns,
  };
});

export default async function SmokeTestingPage({ searchParams }: PageProps) {
  const appsPromise = getData(searchParams);

  return (
    <AppShell>
      <MainShell
        title="Smoke Testing"
        subtitle="Monitor the latest application state, compare recent runs, and inspect individual test diagnostics."
      >
        <Suspenser
          promise={appsPromise}
          fallback={<SmokeTestingCardsSkeleton />} // No need to show a skeleton for the table, as it will be rendered after the cards
        >
          {async (data) => {
            return (
              <>
                <SmokeTestingAppsCard apps={data.apps} />
                <SmokeTestingTable
                  appName={data.appName}
                  smokeRuns={data.smokeRuns}
                />
                <SmokeRunDetailsSheet />
              </>
            );
          }}
        </Suspenser>
      </MainShell>
    </AppShell>
  );
}
