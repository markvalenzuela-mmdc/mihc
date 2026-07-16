import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  finalizeE2eProfileForm: vi.fn(),
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/feature/auth/actions/auth.action", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock(
  "@/feature/e2e/services/e2e-profile-form-finalization.service",
  () => ({
    finalizeE2eProfileForm: mocks.finalizeE2eProfileForm,
  }),
);

import { finalizeE2eProfileFormAction } from "@/feature/e2e/actions/e2e-profile-form.action";

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
  });

  it("rejects unauthenticated finalization before calling the service", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(
      finalizeE2eProfileFormAction({
        core: validCore,
        enrollmateData: {},
      }),
    ).resolves.toEqual({ ok: false, error: "forbidden" });
    expect(mocks.finalizeE2eProfileForm).not.toHaveBeenCalled();
  });

  it("passes the authenticated Better Auth user to the finalization service", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.finalizeE2eProfileForm.mockResolvedValue({
      profileId: "profile-1",
    });

    await expect(
      finalizeE2eProfileFormAction({
        core: validCore,
        enrollmateData: { givenName: "Example" },
      }),
    ).resolves.toEqual({
      ok: true,
      data: { profileId: "profile-1" },
    });
    expect(mocks.finalizeE2eProfileForm).toHaveBeenCalledWith({
      core: validCore,
      enrollmateData: { givenName: "Example" },
      userId: "user-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/e2e-testing");
    expect(mocks.revalidatePath).toHaveBeenCalledOnce();
  });

  it("returns field errors for malformed finalization input", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });

    await expect(
      finalizeE2eProfileFormAction({
        core: { ...validCore, email: "not-an-email" },
        enrollmateData: {},
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        "core.email": expect.any(Array),
      },
    });
    expect(mocks.finalizeE2eProfileForm).not.toHaveBeenCalled();
  });
});
