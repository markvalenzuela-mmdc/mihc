import {
  getEnrollmateFlowDefinition,
  type EnrollmateFlowType,
} from "@mihc/enrollmate-contract";

import { AppShell } from "@/components/app-shell";
import { MainShell } from "@/components/main-shell";
import {
  finalizeE2eProfileFormAction,
} from "@/feature/e2e/actions/e2e-profile-form.action";
import { E2eProfileFormRoute } from "@/feature/e2e/components/profile-form/e2e-profile-form-route";
import { serializeE2eProfileFormEditorSteps } from "@/feature/e2e/serializers/e2e-profile-form-editor.serializer";
import { getApprovedE2eProfileFixtures } from "@/feature/e2e/services/e2e-profile-fixtures.service";
import type { E2eProfileFormEditorStep } from "@/feature/e2e/types/e2e-profile-form.types";
import { Suspense } from "react";
import { requireAuthenticated } from "@/feature/auth/auth-guards";

export default async function NewE2eProfilePage() {
  const user = await requireAuthenticated();
  const flows = {
    bachelors: serializeE2eProfileFormEditorSteps(
      getEnrollmateFlowDefinition("bachelors"),
    ),
    microcredentials: serializeE2eProfileFormEditorSteps(
      getEnrollmateFlowDefinition("microcredentials"),
    ),
  } satisfies Record<EnrollmateFlowType, E2eProfileFormEditorStep[]>;

  return (
    <AppShell user={user}>
      <MainShell
        title="Create E2E profile"
        subtitle="Build a reusable student profile one validated application step at a time."
      >
        <Suspense fallback={<p>Loading profile form...</p>}>
          <E2eProfileFormRoute
            flows={flows}
            fixtures={getApprovedE2eProfileFixtures()}
            finalize={finalizeE2eProfileFormAction}
          />
        </Suspense>
      </MainShell>
    </AppShell>
  );
}
