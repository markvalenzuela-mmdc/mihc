import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileWorkspaceControls } from "@/feature/e2e/components/workspace/e2e-profile-workspace-info";

describe("ProfileWorkspaceControls", () => {
  const steps = Array.from({ length: 8 }, (_, index) => ({
    id: `step-${index + 1}`,
    label: `Step ${index + 1}`,
    description: null,
    sortOrder: index + 1,
    createdAt: new Date(),
  }));

  it("enables automatic runs for step 1 and disables steps 2 through 8", () => {
    render(
      <ProfileWorkspaceControls
        steps={steps}
        activeRun={null}
        selectedStepCount={1}
        selectionLocked={false}
        canRun
        isAutomatedPending={false}
        onSelectedStepCountChange={vi.fn()}
        onAutomated={vi.fn()}
        onManual={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Run selected steps automatically",
      }),
    ).toBeEnabled();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(8);
    for (const checkbox of checkboxes.slice(1)) {
      expect(checkbox).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("disables run actions when the profile has no active form", () => {
    render(
      <ProfileWorkspaceControls
        steps={[
          {
            id: "new",
            label: "New",
            description: null,
            sortOrder: 1,
            createdAt: new Date(),
          },
        ]}
        activeRun={null}
        selectedStepCount={1}
        selectionLocked={false}
        canRun={false}
        isAutomatedPending={false}
        onSelectedStepCountChange={vi.fn()}
        onAutomated={vi.fn()}
        onManual={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Run selected steps automatically",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Start manual run" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "This profile has no active validated application to run.",
      ),
    ).toBeInTheDocument();
  });
});
