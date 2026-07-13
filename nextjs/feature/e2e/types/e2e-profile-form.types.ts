import type {
  EnrollmateField,
  EnrollmateFlowDefinition,
} from "@mihc/enrollmate-contract";

import type { E2eProfileCoreInput } from "@/feature/e2e/schema/e2e-profile-form.schema";

type EnrollmateStep = EnrollmateFlowDefinition["steps"][number];
type EnrollmateSection = EnrollmateStep["sections"][number];

export type E2eProfileFormIntent =
  | "save-and-continue"
  | "save-and-exit"
  | "finalize";

export type E2eProfileFormValues = {
  core: E2eProfileCoreInput;
  enrollmate: Record<string, unknown>;
};

type SaveE2eProfileDraftBase = {
  core: E2eProfileCoreInput;
  stepNumber: number;
  stepData: Record<string, unknown>;
};

export type SaveE2eProfileDraftInput =
  | (SaveE2eProfileDraftBase & { mode: "create"; profileId?: never })
  | (SaveE2eProfileDraftBase & { mode: "edit"; profileId: string });

export type E2eProfileFormFieldErrors = Record<string, string[]>;
export type E2eProfileFormActionError =
  | E2eProfileFormFieldErrors
  | "notFound"
  | "emailConflict"
  | "flowConflict"
  | "definitionConflict"
  | "forbidden"
  | "unexpected";

export type SaveE2eProfileDraftResult =
  | { ok: true; data: { profileId: string; nextStep: number | null } }
  | { ok: false; error: E2eProfileFormActionError };

export type FinalizeE2eProfileFormInput = {
  profileId: string;
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

export type SaveE2eProfileDraft = (
  input: SaveE2eProfileDraftInput,
) => Promise<SaveE2eProfileDraftResult>;

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
