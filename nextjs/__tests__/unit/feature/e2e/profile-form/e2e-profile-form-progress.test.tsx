import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { E2eProfileFormProgress } from "@/feature/e2e/components/profile-form/e2e-profile-form-progress";

describe("E2eProfileFormProgress", () => {
  it("uses equal auto columns for the number of rendered desktop steps", () => {
    render(
      <E2eProfileFormProgress
        activeStep={3}
        steps={[
          { step: 1, title: "Profile" },
          { step: 2, title: "Details" },
          { step: 3, title: "Confirmation" },
        ]}
        validatedSteps={new Set([1, 2])}
      />,
    );

    const progressList = screen.getByRole("list");

    expect(progressList).toHaveClass("sm:grid-flow-col", "sm:auto-cols-fr");
    expect(progressList).not.toHaveClass("sm:grid-cols-4");
    expect(progressList.querySelectorAll(":scope > li")).toHaveLength(3);
  });
});
