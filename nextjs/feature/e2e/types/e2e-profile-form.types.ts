import type {
  EnrollmateField,
  EnrollmateFlowDefinition,
} from "@mihc/enrollmate-contract";

import type { E2eProfileCoreInput } from "@/feature/e2e/schema/e2e-profile-form.schema";

type EnrollmateStep = EnrollmateFlowDefinition["steps"][number];
type EnrollmateSection = EnrollmateStep["sections"][number];

export type E2eProfileFormValues = {
  core: E2eProfileCoreInput;
  enrollmate: Record<string, unknown>;
};

export type E2eProfileMockMode = "full" | "partial";

export type E2eProfileFormPendingAction =
  | "previous"
  | "continue"
  | "finalize";

export type E2eProfileFormFieldErrors = Record<string, string[]>;
export type E2eProfileFormActionError =
  | E2eProfileFormFieldErrors
  | "emailConflict"
  | "forbidden"
  | "unexpected";

export type FinalizeE2eProfileFormInput = {
  core: E2eProfileCoreInput;
  enrollmateData: Record<string, unknown>;
};

export type FinalizeE2eProfileFormResult =
  | { ok: true; data: { profileId: string } }
  | { ok: false; error: E2eProfileFormActionError };

export type E2eProfileFixture = {
  fixtureUri: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type FinalizeE2eProfileForm = (
  input: FinalizeE2eProfileFormInput,
) => Promise<FinalizeE2eProfileFormResult>;

export type E2eProfileFormEditorSection = Omit<
  EnrollmateSection,
  "fields"
> & {
  id: string;
  fields: EnrollmateField[];
};

export type E2eProfileFormEditorStep = Omit<EnrollmateStep, "sections"> & {
  sections: E2eProfileFormEditorSection[];
};
