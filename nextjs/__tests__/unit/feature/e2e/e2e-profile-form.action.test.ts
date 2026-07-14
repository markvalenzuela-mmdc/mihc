import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  finalizeE2eProfileForm: vi.fn(),
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  saveE2eProfileDraft: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/feature/auth/actions/auth.action", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/feature/e2e/services/e2e-profile-draft.service", () => ({
  saveE2eProfileDraft: mocks.saveE2eProfileDraft,
}));
vi.mock(
  "@/feature/e2e/services/e2e-profile-form-finalization.service",
  () => ({
    finalizeE2eProfileForm: mocks.finalizeE2eProfileForm,
  }),
);

import {
  finalizeE2eProfileFormAction,
  saveE2eProfileDraftAction,
} from "@/feature/e2e/actions/e2e-profile-form.action";

const validCore = {
  name: "Example Student",
  middleName: "",
  email: "student@example.com",
  flowType: "bachelors" as const,
};

describe("E2E profile form actions", () => {
  beforeEach(() => {
    mocks.finalizeE2eProfileForm.mockReset();
    mocks.getCurrentUser.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.saveE2eProfileDraft.mockReset();
  });

  it("rejects unauthenticated draft saves before calling the service", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(
      saveE2eProfileDraftAction({
        mode: "create",
        core: validCore,
        stepNumber: 1,
        stepData: {},
      }),
    ).resolves.toEqual({ ok: false, error: "forbidden" });
    expect(mocks.saveE2eProfileDraft).not.toHaveBeenCalled();
  });

  it("passes the authenticated Better Auth user to the draft service", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.saveE2eProfileDraft.mockResolvedValue({
      profileId: "profile-1",
      nextStep: 2,
    });

    await expect(
      saveE2eProfileDraftAction({
        mode: "create",
        core: validCore,
        stepNumber: 1,
        stepData: { givenName: "Example" },
      }),
    ).resolves.toEqual({
      ok: true,
      data: { profileId: "profile-1", nextStep: 2 },
    });
    expect(mocks.saveE2eProfileDraft).toHaveBeenCalledWith({
      mode: "create",
      core: validCore,
      stepNumber: 1,
      stepData: { givenName: "Example" },
      userId: "user-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/e2e-testing");
  });

  it("returns field errors for malformed finalization input", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });

    await expect(
      finalizeE2eProfileFormAction({
        profileId: "not-a-uuid",
        core: validCore,
        enrollmateData: {},
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        profileId: expect.any(Array),
      },
    });
    expect(mocks.finalizeE2eProfileForm).not.toHaveBeenCalled();
  });
});
