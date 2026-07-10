import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileWorkspaceControls } from "@/feature/e2e/components/workspace/e2e-profile-workspace-info";

describe("ProfileWorkspaceControls", () => {
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
        onSelectedStepCountChange={vi.fn()}
        onAutomated={vi.fn()}
        onManual={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Run selected steps locally" }),
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
