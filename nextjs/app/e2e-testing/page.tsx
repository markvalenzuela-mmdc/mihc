import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import {
  e2eRuns,
  e2eStepDefinitions,
  profiles,
} from "@/lib/mock-testing-data";
import { E2eTestingClient } from "./_components/e2e-testing-client";

export default function E2eTestingPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <E2eTestingClient
          initialRuns={e2eRuns}
          profiles={profiles}
          stepDefinitions={e2eStepDefinitions}
        />
      </Suspense>
    </AppShell>
  );
}
