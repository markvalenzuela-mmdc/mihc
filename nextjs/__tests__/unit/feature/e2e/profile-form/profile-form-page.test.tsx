import { getEnrollmateFlowDefinition } from "@mihc/enrollmate-contract";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAppForm } from "@/components/blocks/Form/use-form.hook";
import { E2eProfileCoreFields, e2eProfileFormOptions } from "@/feature/e2e/components/profile-form/e2e-profile-core-fields";
import { E2eProfileFormActions } from "@/feature/e2e/components/profile-form/e2e-profile-form-actions";
import { E2eProfileFormProgress } from "@/feature/e2e/components/profile-form/e2e-profile-form-progress";
import { serializeE2eProfileFormEditorSteps } from "@/feature/e2e/serializers/e2e-profile-form-editor.serializer";

const bachelorSteps = serializeE2eProfileFormEditorSteps(
  getEnrollmateFlowDefinition("bachelors"),
);

function CoreFieldsHarness({ isFlowLocked = false }) {
  const form = useAppForm({ ...e2eProfileFormOptions });

  return (
    <form.AppForm>
      <E2eProfileCoreFields form={form} isFlowLocked={isFlowLocked} />
      <form.Subscribe selector={(state) => state.values.core.flowType}>
        {(flowType) => <output data-testid="flow-value">{flowType}</output>}
      </form.Subscribe>
    </form.AppForm>
  );
}

describe("E2eProfileCoreFields", () => {
  it("exposes typed profile fields and both flow choices", async () => {
    render(<CoreFieldsHarness />);

    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveAttribute(
      "autocomplete",
      "name",
    );
    expect(screen.getByRole("textbox", { name: "Middle name" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute(
      "type",
      "email",
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Application flow" }));
    expect(await screen.findByRole("option", { name: "Bachelor" })).toBeVisible();
    expect(
      await screen.findByRole("option", { name: "Microcredential" }),
    ).toBeVisible();
    const microcredentialOption = await screen.findByRole("option", {
      name: "Microcredential",
    });
    fireEvent.pointerDown(microcredentialOption);
    fireEvent.pointerUp(microcredentialOption);
    fireEvent.click(microcredentialOption);
    await waitFor(() =>
      expect(screen.getByTestId("flow-value")).toHaveTextContent(
        "microcredentials",
      ),
    );
  });

  it("locks the flow choice after the first successful draft", () => {
    render(<CoreFieldsHarness isFlowLocked />);

    expect(
      screen.getByRole("combobox", { name: "Application flow" }),
    ).toBeDisabled();
  });
});

describe("E2eProfileFormProgress", () => {
  it("renders ordered, current, and validated step states", () => {
    const { container } = render(
      <E2eProfileFormProgress
        steps={bachelorSteps}
        activeStep={2}
        validatedSteps={new Set([1])}
      />,
    );

    const progress = screen.getByRole("navigation", {
      name: "Profile creation progress",
    });
    expect(progress.querySelector("ol")).toBeInTheDocument();
    expect(within(progress).getByText(bachelorSteps[0]!.title)).toHaveTextContent(
      bachelorSteps[0]!.title,
    );
    expect(
      within(progress).getByText(bachelorSteps[1]!.title).closest("li"),
    ).toHaveAttribute("aria-current", "step");
    expect(
      within(progress).getByText(bachelorSteps[0]!.title).closest("li"),
    ).toHaveAttribute("data-state", "validated");
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("preserves current and validated states when they overlap", () => {
    render(
      <E2eProfileFormProgress
        steps={bachelorSteps}
        activeStep={2}
        validatedSteps={new Set([2])}
      />,
    );

    const currentStep = screen
      .getByText(bachelorSteps[1]!.title)
      .closest("li");
    expect(currentStep).toHaveAttribute("aria-current", "step");
    expect(currentStep).toHaveAttribute("data-validated", "true");
    expect(within(currentStep!).getByText("Validated")).toBeInTheDocument();
  });
});

describe("E2eProfileFormActions", () => {
  it("renders the expected navigation and draft actions", () => {
    const onPrevious = vi.fn();
    const onSaveAndContinue = vi.fn();
    const onSaveAndExit = vi.fn();
    render(
      <E2eProfileFormActions
        currentStep={2}
        totalSteps={3}
        isPending={false}
        onPrevious={onPrevious}
        onSaveAndContinue={onSaveAndContinue}
        onSaveAndExit={onSaveAndExit}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Save and continue" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Save draft and exit" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Validate and finish" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Save draft and exit" }));
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onSaveAndContinue).toHaveBeenCalledOnce();
    expect(onSaveAndExit).toHaveBeenCalledOnce();
  });

  it("shows the finish action on confirmation and disables every action while pending", () => {
    render(
      <E2eProfileFormActions
        currentStep={3}
        totalSteps={3}
        isPending
        onPrevious={vi.fn()}
        onSaveAndContinue={vi.fn()}
        onSaveAndExit={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Save and continue" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Validate and finish" }),
    ).toBeDisabled();
    expect(screen.getByRole("group", { name: "Profile form actions" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Saving profile…");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });

  it("invokes finalize from the confirmation action", () => {
    const onFinalize = vi.fn();
    render(
      <E2eProfileFormActions
        currentStep={3}
        totalSteps={3}
        isPending={false}
        onPrevious={vi.fn()}
        onSaveAndContinue={vi.fn()}
        onSaveAndExit={vi.fn()}
        onFinalize={onFinalize}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Validate and finish" }),
    );
    expect(onFinalize).toHaveBeenCalledOnce();
  });
});
