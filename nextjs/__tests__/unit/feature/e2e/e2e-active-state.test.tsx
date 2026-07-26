import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { E2eSelectedRun } from "@/feature/e2e/types/e2e-testing.types";

vi.mock("@/components/ui/sheet", () => ({
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import E2eRunDetails from "@/feature/e2e/components/workspace/e2e-profile-workspace-runs";

const runningRun: E2eSelectedRun = {
  id: "run-1",
  runNumber: 7,
  profileId: "profile-1",
  status: "running",
  startedBy: null,
  startedAt: "2026-07-25T08:00:00.000Z",
  completedAt: null,
  steps: [],
  summary: {
    includedSteps: 0,
    totalSteps: 3,
    passedSteps: 0,
    failedSteps: 0,
    durationSeconds: null,
  },
};

describe("active E2E run state", () => {
  it("shows a loader before the first check is persisted", () => {
    render(<E2eRunDetails run={runningRun} onBack={vi.fn()} />);

    expect(screen.getByText("Waiting for test results…")).toBeVisible();
    expect(screen.getByRole("status", { name: "Loading" })).toBeVisible();
  });

  it("keeps the loader visible while more checks are expected", () => {
    render(
      <E2eRunDetails
        run={{
          ...runningRun,
          steps: [
            {
              id: "run-step-1",
              stepId: "new",
              status: "success",
              durationSeconds: 2.4,
              note: null,
              e2eStep: {
                id: "new",
                label: "New",
                description: null,
                sortOrder: 1,
                createdAt: new Date("2026-07-25T08:00:00.000Z"),
              },
              tests: [
                {
                  id: "test-1",
                  testName: "page-loads",
                  status: "success",
                  durationMs: 2400,
                  errorMessage: null,
                },
              ],
            },
          ],
        }}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("Waiting for more test results…")).toBeVisible();
    expect(screen.getByRole("status", { name: "Loading" })).toBeVisible();
    expect(screen.getByText("page-loads")).toBeVisible();
  });

  it("does not show the loader for a terminal empty run", () => {
    render(
      <E2eRunDetails
        run={{ ...runningRun, status: "aborted", completedAt: runningRun.startedAt }}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryByText("Waiting for test results…")).not.toBeInTheDocument();
  });
});
