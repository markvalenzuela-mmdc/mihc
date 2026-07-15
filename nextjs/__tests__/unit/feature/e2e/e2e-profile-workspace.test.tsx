import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { E2eProfileWorkspaceData } from "@/feature/e2e/types/e2e-testing.types";
import E2eProfileWorkspace from "@/feature/e2e/components/workspace/e2e-profile-workspace";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const requestE2eTest = vi.hoisted(() => vi.fn());
const useQueryState = vi.hoisted(() => vi.fn(() => [null, vi.fn()]));
const useQueryStates = vi.hoisted(() => vi.fn(() => [{}, vi.fn()]));

vi.mock("@/feature/e2e/actions/request-e2e-test.action", () => ({
  requestE2eTest,
}));

vi.mock("nuqs", () => ({
  useQueryState,
  useQueryStates,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const steps = Array.from({ length: 8 }, (_, index) => ({
  id: `step-${index + 1}`,
  label: `Step ${index + 1}`,
  description: null,
  sortOrder: index + 1,
  createdAt: new Date(),
}));

const workspaceData = {
  profile: {
    id: "profile-1",
    name: "Sample Intern",
    middleName: null,
    email: "sample.intern@example.com",
    flowType: "bachelors",
    status: "new",
    latestRun: null,
    operationalData: {},
    profileForm: {
      state: "active",
      definitionHash: "definition-1",
      data: {},
    },
  },
  activeRun: null,
  stepDefinitions: steps,
} as unknown as E2eProfileWorkspaceData;

const emptyRuns = {
  meta: {
    isFirstPage: true,
    isLastPage: true,
    currentPage: 1,
    previousPage: null,
    nextPage: null,
    pageCount: 1,
    totalCount: 0,
  },
  data: [],
};

describe("E2eProfileWorkspace", () => {
  beforeEach(() => {
    requestE2eTest.mockReset();
  });

  it("requests the current profile's selected steps and disables controls while pending", async () => {
    let resolveRequest!: (result: {
      ok: true;
      data: { correlationId: string };
    }) => void;
    requestE2eTest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    render(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <E2eProfileWorkspace
            data={workspaceData}
            runs={emptyRuns}
            isRunHistoryLoading={false}
            isRunHistoryFetching={false}
            isRunHistoryError={false}
            selectedRun={null}
          />
        </SheetContent>
      </Sheet>,
    );

    const automatedButton = screen.getByRole("button", {
      name: "Run selected steps automatically",
    });
    fireEvent.click(automatedButton);

    await waitFor(() =>
      expect(requestE2eTest).toHaveBeenCalledWith({
        profileId: "profile-1",
        stepIds: ["step-1"],
      }),
    );
    expect(automatedButton).toBeDisabled();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(8);
    for (const checkbox of checkboxes.slice(1)) {
      expect(checkbox).toHaveAttribute("aria-disabled", "true");
    }

    resolveRequest({ ok: true, data: { correlationId: "corr-1" } });
    await waitFor(() => expect(automatedButton).toBeEnabled());
  });
});
