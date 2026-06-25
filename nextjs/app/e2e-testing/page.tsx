import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { profileRuns, profiles, scenarios } from "@/lib/mock-testing-data";
import { E2eTestingClient } from "./_components/e2e-testing-client";

export default function E2eTestingPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <E2eTestingClient
          profileRuns={profileRuns}
          profiles={profiles}
          scenarios={scenarios}
        />
      </Suspense>
    </AppShell>
  );
}
