import { AppShell } from "@/components/app-shell";
import { smokeApps, smokeRuns } from "@/lib/mock-testing-data";
import { SmokeTestingClient } from "./_components/smoke-testing-client";

export default function SmokeTestingPage() {
  return (
    <AppShell>
      <SmokeTestingClient apps={smokeApps} initialRuns={smokeRuns} />
    </AppShell>
  );
}
