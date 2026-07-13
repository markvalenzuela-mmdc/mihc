import type {
  E2eProfileFixture,
  FinalizeE2eProfileForm,
  SaveE2eProfileDraft,
} from "@/feature/e2e/types/e2e-profile-form.types";

export const MOCK_E2E_PROFILE_FIXTURES: E2eProfileFixture[] = [
  {
    fixtureUri: "mock://enrollmate/sample.pdf",
    filename: "sample.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
  },
];

export function createInMemoryE2eProfileFormMock() {
  const steps = new Map<number, Record<string, unknown>>();
  const mockProfileId = "mock-e2e-profile";

  const saveDraft: SaveE2eProfileDraft = async (input) => {
    steps.set(input.stepNumber, structuredClone(input.stepData));

    return {
      ok: true,
      data: {
        profileId:
          input.mode === "edit" ? input.profileId : mockProfileId,
        nextStep: input.stepNumber + 1,
      },
    };
  };

  const finalize: FinalizeE2eProfileForm = async (input) => ({
    ok: true,
    data: { profileId: input.profileId },
  });

  return {
    fixtures: MOCK_E2E_PROFILE_FIXTURES,
    saveDraft,
    finalize,
    dispose: () => steps.clear(),
  };
}
