import {
  getEnrollmateFlowDefinition,
  type EnrollmateFlowType,
} from "@mihc/enrollmate-contract";

import { AppShell } from "@/components/app-shell";
import { MainShell } from "@/components/main-shell";
import { E2eProfileFormPage } from "@/feature/e2e/components/profile-form/e2e-profile-form-page";
import { serializeE2eProfileFormEditorSteps } from "@/feature/e2e/serializers/e2e-profile-form-editor.serializer";
import type { E2eProfileFormEditorStep } from "@/feature/e2e/types/e2e-profile-form.types";

export default function NewE2eProfilePage() {
  const flows = {
    bachelors: serializeE2eProfileFormEditorSteps(
      getEnrollmateFlowDefinition("bachelors"),
    ),
    microcredentials: serializeE2eProfileFormEditorSteps(
      getEnrollmateFlowDefinition("microcredentials"),
    ),
  } satisfies Record<EnrollmateFlowType, E2eProfileFormEditorStep[]>;

  return (
    <AppShell>
      <MainShell
        title="Create E2E profile"
        subtitle="Build a reusable student profile one validated application step at a time. Phase 1 drafts remain in this page only."
      >
        <E2eProfileFormPage flows={flows} />
      </MainShell>
    </AppShell>
  );
}
