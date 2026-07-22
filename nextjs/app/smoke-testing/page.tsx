import { AppShell } from "@/components/app-shell";
import { MainShell } from "@/components/main-shell";
import { SmokeTestingLiveUpdates } from "@/feature/smoke/components/smoke-testing-live-updates";
import { SmokeTestingContent } from "@/feature/smoke/components/smoke-testing-content";
import SmokeRunDetailsSheet from "@/feature/smoke/components/smoke-run-details-sheet";
import { requireAuthenticated } from "@/feature/auth/auth-guards";

export default async function SmokeTestingPage() {
  const user = await requireAuthenticated();

  return (
    <AppShell user={user}>
      <MainShell
        title="Smoke Testing"
        subtitle="Monitor the latest application state, compare recent runs, and inspect individual test diagnostics."
      >
        <SmokeTestingLiveUpdates />
        <SmokeTestingContent />
        <SmokeRunDetailsSheet />
      </MainShell>
    </AppShell>
  );
}
