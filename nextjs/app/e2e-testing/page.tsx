import { AppShell } from "@/components/app-shell";
import { MainShell } from "@/components/main-shell";
import Suspenser from "@/components/blocks/Suspenser/suspenser";
import {
  loadLimitSearchParams,
  loadPaginationSearchParams,
} from "@/components/blocks/DataTable/data-table-query-state";
import E2eProfileWorkspaceSheet from "@/feature/e2e/components/workspace/e2e-profile-workspace-sheet";
import { E2eTestingProfilesSkeleton } from "@/feature/e2e/components/profiles/e2e-testing-profiles-skeleton";
import { E2eTestingProfilesTable } from "@/feature/e2e/components/profiles/e2e-testing-profiles-table";
import { getPaginatedE2eProfiles } from "@/feature/e2e/services/e2e-profile.service";
import { SearchParams } from "nuqs";
import { cache } from "react";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

const getData = cache(async (searchParams: Promise<SearchParams>) => {
  const { limit: limitValue } = await loadLimitSearchParams(searchParams);
  const { page } = await loadPaginationSearchParams(searchParams);

  const limit = Math.min(Math.max(1, limitValue ?? 5), 100);

  const profiles = await getPaginatedE2eProfiles({
    limit,
    page,
  });

  return {
    profiles,
  };
});

export default async function E2eTestingPage({ searchParams }: PageProps) {
  const dataPromise = getData(searchParams);

  return (
    <AppShell>
      <MainShell
        title="End-to-End Testing"
        subtitle="Review enrollment-ready profiles, start complete test sessions, and trace results from run to assertion."
      >
        <Suspenser
          promise={dataPromise}
          fallback={<E2eTestingProfilesSkeleton />}
        >
          {async (data) => {
            return (
              <>
                <E2eTestingProfilesTable profiles={data.profiles} />
                <E2eProfileWorkspaceSheet />
              </>
            );
          }}
        </Suspenser>
      </MainShell>
    </AppShell>
  );
}
