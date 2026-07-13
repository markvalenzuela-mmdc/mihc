import type { EnrollmateFlowDefinition } from "@mihc/enrollmate-contract";

import type { E2eProfileFormEditorStep } from "@/feature/e2e/types/e2e-profile-form.types";

export function serializeE2eProfileFormEditorSteps(
  flow: EnrollmateFlowDefinition,
): E2eProfileFormEditorStep[] {
  return flow.steps.map((step) => ({
    ...step,
    sections: step.sections.map((section, sectionIndex) => ({
      ...section,
      id:
        section.prefix ??
        `step-${step.step}-section-${sectionIndex + 1}`,
      fields: section.fields,
    })),
  }));
}
