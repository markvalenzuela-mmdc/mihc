import {
  getEnrollmateFlowDefinition,
  getEnrollmateStepValidator,
} from "@mihc/enrollmate-contract";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAppForm } from "@/components/blocks/Form/use-form.hook";
import { E2eProfileCoreFields, e2eProfileFormOptions } from "@/feature/e2e/components/profile-form/e2e-profile-core-fields";
import { E2eProfileFormActions } from "@/feature/e2e/components/profile-form/e2e-profile-form-actions";
import { E2eProfileFormPage } from "@/feature/e2e/components/profile-form/e2e-profile-form-page";
import { E2eProfileFormProgress } from "@/feature/e2e/components/profile-form/e2e-profile-form-progress";
import { serializeE2eProfileFormEditorSteps } from "@/feature/e2e/serializers/e2e-profile-form-editor.serializer";
import type {
  E2eProfileFixture,
  E2eProfileFormEditorStep,
  FinalizeE2eProfileForm,
} from "@/feature/e2e/types/e2e-profile-form.types";

const contractValidation = vi.hoisted(() => ({
  stepSafeParse: vi.fn(),
  fullSafeParse: vi.fn(),
  realGetStepValidator: undefined as
    | undefined
    | ((
        flowType: "bachelors" | "microcredentials",
        stepNumber: number,
      ) => { safeParse: (values: Record<string, unknown>) => unknown }),
}));

vi.mock("@mihc/enrollmate-contract", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@mihc/enrollmate-contract")
  >();
  contractValidation.realGetStepValidator = actual.getEnrollmateStepValidator;

  return {
    ...actual,
    getEnrollmateStepValidator: vi.fn(() => ({
      safeParse: contractValidation.stepSafeParse,
    })),
    getEnrollmateValidator: vi.fn(() => ({
      safeParse: contractValidation.fullSafeParse,
    })),
  };
});

const bachelorSteps = serializeE2eProfileFormEditorSteps(
  getEnrollmateFlowDefinition("bachelors"),
);
const microcredentialSteps = serializeE2eProfileFormEditorSteps(
  getEnrollmateFlowDefinition("microcredentials"),
);
const flows: Record<
  "bachelors" | "microcredentials",
  E2eProfileFormEditorStep[]
> = {
  bachelors: bachelorSteps,
  microcredentials: microcredentialSteps,
};
const fixtures: E2eProfileFixture[] = [
  {
    fixtureUri: "test://fixtures/sample.pdf",
    filename: "sample.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
  },
];
function successfulFinalize(profileId = "profile-1"): FinalizeE2eProfileForm {
  return vi.fn(async () => ({
    ok: true as const,
    data: { profileId },
  }));
}

function renderPage({
  finalize = successfulFinalize(),
  onFinish,
  onUrlUpdate,
  isNavigating,
  searchParams,
}: {
  finalize?: FinalizeE2eProfileForm;
  onFinish?: (profileId: string) => void;
  onUrlUpdate?: (event: UrlUpdateEvent) => void;
  isNavigating?: boolean;
  searchParams?: string;
} = {}) {
  return render(
    <NuqsTestingAdapter
      searchParams={searchParams}
      onUrlUpdate={onUrlUpdate}
      hasMemory
    >
      <E2eProfileFormPage
        flows={flows}
        isNavigating={isNavigating}
        fixtures={fixtures}
        finalize={finalize}
        onFinish={onFinish}
      />
    </NuqsTestingAdapter>,
  );
}

function getProfileFormActionGroup(position: "top" | "bottom" = "bottom") {
  return screen.getByRole("group", {
    name:
      position === "top" ? "Top profile form actions" : "Profile form actions",
  });
}

function getProfileFormActionButton(
  name: string,
  position: "top" | "bottom" = "bottom",
) {
  return within(getProfileFormActionGroup(position)).getByRole("button", {
    name,
  });
}

function fillValidCore() {
  fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
    target: { value: "Example Student" },
  });
  fireEvent.change(screen.getAllByRole("textbox", { name: "Email" })[0]!, {
    target: { value: "student@example.com" },
  });
}

async function chooseFlow(name: "Bachelor" | "Microcredential") {
  await chooseOption("Application flow", name);
}

async function chooseOption(controlName: string, optionName: string) {
  fireEvent.click(screen.getByRole("combobox", { name: controlName }));
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.pointerDown(option);
  fireEvent.pointerUp(option);
  fireEvent.click(option);
}

async function advanceToStep(
  targetStep: number,
  stepDefinitions: readonly E2eProfileFormEditorStep[] = bachelorSteps,
) {
  for (let currentStep = 1; currentStep < targetStep; currentStep += 1) {
    fireEvent.click(getProfileFormActionButton("Continue"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: stepDefinitions[currentStep]!.title,
        }),
      ).toBeVisible(),
    );
    await waitFor(() =>
      expect(
        getProfileFormActionButton(
          currentStep + 1 === stepDefinitions.length
            ? "Validate and finish"
            : "Continue",
        ),
      ).toBeEnabled(),
    );
  }
}

async function chooseFixtureOption(controlName: string, optionName: string) {
  const input = screen.getByRole("combobox", { name: controlName });
  const inputGroup = input.closest('[data-slot="input-group"]');
  if (!(inputGroup instanceof HTMLElement)) {
    throw new Error(`${controlName} is missing its input group`);
  }
  fireEvent.click(within(inputGroup).getByRole("button"));
  fireEvent.click(await screen.findByRole("option", { name: optionName }));
}

function CoreFieldsHarness() {
  const form = useAppForm({ ...e2eProfileFormOptions });

  return (
    <form.AppForm>
      <E2eProfileCoreFields form={form} />
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
  it("confirms the mock mode before invoking the action", () => {
    const onPrevious = vi.fn();
    const onContinue = vi.fn();
    const onMockCurrentStep = vi.fn();
    render(
      <E2eProfileFormActions
        canMockCurrentStep
        currentStep={2}
        totalSteps={3}
        isPending={false}
        onMockCurrentStep={onMockCurrentStep}
        onPrevious={onPrevious}
        onContinue={onContinue}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Mock current step" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Save and continue" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save draft and exit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Validate and finish" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Mock current step" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onMockCurrentStep).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mock current step" }));
    fireEvent.click(screen.getByRole("button", { name: "Fill all fields" }));
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onMockCurrentStep).toHaveBeenCalledWith("full");

    fireEvent.click(screen.getByRole("button", { name: "Mock current step" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Random partial fill" }),
    );
    expect(onMockCurrentStep).toHaveBeenCalledWith("partial");
  });

  it("disables every action while pending without rendering button spinners", () => {
    render(
      <E2eProfileFormActions
        canMockCurrentStep
        currentStep={3}
        totalSteps={3}
        isPending={true}
        onMockCurrentStep={vi.fn()}
        onPrevious={vi.fn()}
        onContinue={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Save and continue" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Validate and finish" }),
    ).toBeDisabled();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not render action-specific loading indicators", () => {
    render(
      <E2eProfileFormActions
        canMockCurrentStep={false}
        currentStep={2}
        totalSteps={3}
        isPending={true}
        onMockCurrentStep={vi.fn()}
        onPrevious={vi.fn()}
        onContinue={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("invokes finalize from the confirmation action", () => {
    const onFinalize = vi.fn();
    render(
      <E2eProfileFormActions
        canMockCurrentStep={false}
        currentStep={3}
        totalSteps={3}
        isPending={false}
        onMockCurrentStep={onFinalize}
        onPrevious={vi.fn()}
        onContinue={vi.fn()}
        onFinalize={onFinalize}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Validate and finish" }),
    );
    expect(onFinalize).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Mock current step" }),
    ).not.toBeInTheDocument();
  });
});

describe("E2eProfileFormPage", () => {
  beforeEach(() => {
    vi.mocked(getEnrollmateStepValidator).mockClear();
    contractValidation.stepSafeParse.mockReset();
    contractValidation.stepSafeParse.mockReturnValue({
      success: true,
      data: {},
    });
    contractValidation.fullSafeParse.mockReset();
    contractValidation.fullSafeParse.mockReturnValue({
      success: true,
      data: {},
    });
  });

  it("renders action groups above and below the form fields", () => {
    renderPage();

    const topActions = getProfileFormActionGroup("top");
    const bottomActions = getProfileFormActionGroup("bottom");
    const fieldset = document.querySelector("fieldset");
    expect(topActions).toBeInTheDocument();
    expect(bottomActions).toBeInTheDocument();
    expect(fieldset).not.toBeNull();
    expect(
      topActions.compareDocumentPosition(fieldset!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      fieldset!.compareDocumentPosition(bottomActions) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(getProfileFormActionButton("Continue", "top")).toBeEnabled();
    expect(getProfileFormActionButton("Continue", "bottom")).toBeEnabled();
  });

  it("updates municipality options after selecting a province", async () => {
    renderPage();
    await chooseOption("Current Country", "Philippines");

    await chooseOption("Current Province", "Rizal");
    fireEvent.click(
      screen.getByRole("combobox", { name: "Current City/Municipality" }),
    );

    expect(
      await screen.findByRole("option", { name: "Antipolo City" }),
    ).toBeInTheDocument();
  });

  it("shows profile details only on the first step", () => {
    const { unmount } = renderPage();
    expect(
      screen.getByRole("heading", { name: "Profile details" }),
    ).toBeVisible();

    unmount();
    renderPage({ searchParams: "?step=2" });
    expect(
      screen.queryByRole("heading", { name: "Profile details" }),
    ).not.toBeInTheDocument();
  });

  it("renders separators only between active-step sections", () => {
    renderPage({ searchParams: "?step=2" });

    expect(document.querySelectorAll('[data-slot="separator"]')).toHaveLength(
      Math.max(bachelorSteps[1]!.sections.length - 1, 0),
    );
  });

  it("clears and disables a parent's fields when status changes", async () => {
    renderPage({ searchParams: "step=2" });

    const fatherName = screen.getByRole("textbox", {
      name: "Father First name",
    });
    fireEvent.change(fatherName, { target: { value: "Existing Father" } });

    const livingStatuses = screen.getAllByRole("combobox", {
      name: "Living Status",
    });
    expect(livingStatuses).toHaveLength(2);
    fireEvent.click(livingStatuses[0]!);
    const deceasedOption = await screen.findByRole("option", {
      name: "Deceased",
    });
    fireEvent.pointerDown(deceasedOption);
    fireEvent.pointerUp(deceasedOption);
    fireEvent.click(deceasedOption);

    await waitFor(() => expect(fatherName).toHaveValue(""));
    expect(fatherName).toBeDisabled();
  });

  it("keeps an invalid active step in place without moving focus", async () => {
    contractValidation.stepSafeParse.mockReturnValue({
      success: false,
      error: {
        issues: [{ path: ["email"], message: "Email is required." }],
      },
    });
    renderPage();
    fillValidCore();

    const continueButton = getProfileFormActionButton("Continue");
    continueButton.focus();
    fireEvent.click(continueButton);

    expect(await screen.findAllByText("Email is required.")).not.toHaveLength(0);
    const errorSummary = document.getElementById("e2e-profile-form-errors");
    const fieldset = document.querySelector("fieldset");
    const actionGroup = getProfileFormActionGroup();
    expect(errorSummary).not.toBeNull();
    expect(fieldset).not.toBeNull();
    expect(
      fieldset!.compareDocumentPosition(errorSummary!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      errorSummary!.compareDocumentPosition(actionGroup) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(document.activeElement).toBe(continueButton);
    expect(
      within(screen.getByRole("navigation", {
        name: "Profile creation progress",
      })).getByText(bachelorSteps[0]!.title).closest("li"),
    ).toHaveAttribute("aria-current", "step");
  });

  it("advances without persisting the profile", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const finalize = successfulFinalize();
    renderPage({ onUrlUpdate, finalize });
    fillValidCore();

    fireEvent.click(getProfileFormActionButton("Continue"));

    expect(finalize).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Profile details" }),
      ).not.toBeInTheDocument(),
    );
    expect(onUrlUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ queryString: "?step=2" }),
    );
    expect(getEnrollmateStepValidator).toHaveBeenCalledWith("bachelors", 1);
    expect(
      within(screen.getByRole("navigation", {
        name: "Profile creation progress",
      })).getByText(bachelorSteps[1]!.title).closest("li"),
    ).toHaveAttribute("aria-current", "step");
  });

  it("moves backward without persisting and can continue locally", async () => {
    renderPage();
    fillValidCore();
    await advanceToStep(2);

    fireEvent.click(getProfileFormActionButton("Previous"));
    await waitFor(() =>
      expect(
        within(screen.getByRole("navigation", {
          name: "Profile creation progress",
        })).getByText(bachelorSteps[0]!.title).closest("li"),
      ).toHaveAttribute("aria-current", "step"),
    );
    await waitFor(() =>
      expect(getProfileFormActionButton("Continue")).toBeEnabled(),
    );
    fireEvent.click(getProfileFormActionButton("Continue"));
    expect(
      within(getProfileFormActionGroup()).queryByRole("button", {
        name: "Validate and finish",
      }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(screen.getByRole("navigation", {
          name: "Profile creation progress",
        })).getByText(bachelorSteps[1]!.title).closest("li"),
      ).toHaveAttribute("aria-current", "step"),
    );
  });

  it("mocks the current step without submitting", async () => {
    const finalize = successfulFinalize();
    renderPage({ finalize });

    fireEvent.click(getProfileFormActionButton("Mock current step"));
    fireEvent.click(screen.getByRole("button", { name: "Fill all fields" }));

    await waitFor(() =>
      expect(
        (screen.getByRole("textbox", { name: "Full name" }) as HTMLInputElement)
          .value,
      ).toMatch(/\S+\s+\S+/),
    );
    expect(finalize).not.toHaveBeenCalled();
  });

  it("shows a full-page loading state while final navigation is pending", () => {
    renderPage({
      isNavigating: true,
      searchParams: "?step=4",
    });

    expect(
      screen.getByRole("status", { name: "Finalizing profile" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Validate and finish" }),
    ).not.toBeInTheDocument();
  });

  it("shows a full-page loading state while finalization is pending", async () => {
    let resolveFinalize!: (
      result: Awaited<ReturnType<FinalizeE2eProfileForm>>,
    ) => void;
    const finalize = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<FinalizeE2eProfileForm>>>((resolve) => {
          resolveFinalize = resolve;
        }),
    );
    renderPage({ finalize });
    fillValidCore();
    await advanceToStep(4);

    fireEvent.click(getProfileFormActionButton("Validate and finish"));

    await waitFor(() => expect(finalize).toHaveBeenCalledOnce());
    expect(
      screen.getByRole("status", { name: "Finalizing profile" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Validate and finish" }),
    ).not.toBeInTheDocument();

    resolveFinalize({ ok: true, data: { profileId: "profile-1" } });
    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: "Finalizing profile" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("removes stale hidden values before validation, extraction, or focus", async () => {
    const medicalQuestion =
      "Have you ever been diagnosed with any medical, psychological, or learning difficulty?";
    contractValidation.stepSafeParse.mockImplementation((values) =>
      Object.hasOwn(values, "DR")
        ? {
            success: false,
            error: {
              issues: [{ path: ["DR"], message: "Hidden report is stale." }],
            },
          }
        : { success: true, data: values },
    );
    renderPage();
    fillValidCore();

    await chooseOption(medicalQuestion, "Yes");
    await chooseFixtureOption("Doctor's Report", "sample.pdf");
    await chooseOption(medicalQuestion, "No");
    await waitFor(() =>
      expect(
        screen.queryByRole("combobox", { name: "Doctor's Report" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(getProfileFormActionButton("Continue"));

    expect(contractValidation.stepSafeParse).toHaveBeenCalledWith(
      expect.not.objectContaining({ DR: expect.anything() }),
    );
    expect(screen.queryByText("Hidden report is stale.")).not.toBeInTheDocument();
    expect(document.activeElement).not.toHaveAttribute("name", "enrollmate.DR");
  });

  it.each([
    ["?step=0", "?step=1"],
    ["?step=999", "?step=4"],
  ])("canonicalizes an invalid %s query step", async (searchParams, expected) => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    renderPage({ onUrlUpdate, searchParams });

    await waitFor(() =>
      expect(onUrlUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ queryString: expected }),
      ),
    );
  });

  it("delegates a confirmation step to the real contract validator", async () => {
    renderPage();
    fillValidCore();
    await advanceToStep(4);

    vi.mocked(getEnrollmateStepValidator).mockImplementationOnce(
      (flowType, stepNumber) =>
        contractValidation.realGetStepValidator!(flowType, stepNumber) as ReturnType<
          typeof getEnrollmateStepValidator
        >,
    );

    fireEvent.click(getProfileFormActionButton("Validate and finish"));

    expect(getEnrollmateStepValidator).toHaveBeenCalledWith("bachelors", 4);
    await waitFor(() => expect(getProfileFormActionButton("Validate and finish")).toBeEnabled());
  });

  it("changes flow on the first step and returns to its first step", async () => {
    renderPage();

    await chooseFlow("Microcredential");

    await waitFor(() =>
      expect(
        within(screen.getByRole("navigation", {
          name: "Profile creation progress",
        })).getByText(microcredentialSteps[0]!.title).closest("li"),
      ).toHaveAttribute("aria-current", "step"),
    );
    expect(screen.queryByText(bachelorSteps[1]!.title)).not.toBeInTheDocument();
    expect(contractValidation.stepSafeParse).not.toHaveBeenCalled();
  });

  it("validates the complete microcredential form before finalizing", async () => {
    const finalize = successfulFinalize("micro-profile");
    const onFinish = vi.fn();
    renderPage({ finalize, onFinish });
    fillValidCore();
    await chooseFlow("Microcredential");

    fireEvent.click(getProfileFormActionButton("Continue"));
    await screen.findByRole("heading", {
      name: microcredentialSteps[1]!.title,
    });
    const continueButton = getProfileFormActionButton("Continue");
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    const validateButton = getProfileFormActionButton("Validate and finish");
    await waitFor(() => expect(validateButton).toBeEnabled());

    contractValidation.fullSafeParse.mockReturnValueOnce({
      success: false,
      error: {
        issues: [{ path: ["givenName"], message: "Given name is required." }],
      },
    });
    fireEvent.click(validateButton);
    expect(await screen.findAllByText("Given name is required.")).not.toHaveLength(0);
    expect(finalize).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: microcredentialSteps[0]!.title,
        }),
      ).toBeVisible(),
    );
    expect(document.activeElement).not.toHaveAttribute(
      "name",
      "enrollmate.givenName",
    );

    contractValidation.fullSafeParse.mockReturnValue({
      success: true,
      data: {},
    });
    await waitFor(() =>
      expect(
        getProfileFormActionButton("Continue"),
      ).toBeEnabled(),
    );
    fireEvent.click(getProfileFormActionButton("Continue"));
    await screen.findByRole("heading", {
      name: microcredentialSteps[1]!.title,
    });
    await waitFor(() =>
      expect(
        getProfileFormActionButton("Continue"),
      ).toBeEnabled(),
    );
    fireEvent.click(getProfileFormActionButton("Continue"));
    const finalValidateButton = getProfileFormActionButton("Validate and finish");
    await waitFor(() => expect(finalValidateButton).toBeEnabled());
    fireEvent.click(finalValidateButton);
    await waitFor(() => expect(finalize).toHaveBeenCalledOnce());
    expect(finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        core: expect.objectContaining({ flowType: "microcredentials" }),
        enrollmateData: {},
      }),
    );
    expect(onFinish).toHaveBeenCalledWith("micro-profile");
  });

  it("subscribes to beforeunload only while the form is dirty", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderPage();

    expect(addEventListener).not.toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
      target: { value: "Dirty profile" },
    });
    await waitFor(() =>
      expect(addEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      ),
    );

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("keeps the local draft dirty after Continue", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    renderPage();
    fillValidCore();
    await waitFor(() =>
      expect(addEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      ),
    );
    removeEventListener.mockClear();

    fireEvent.click(getProfileFormActionButton("Continue"));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: bachelorSteps[1]!.title })).toBeVisible(),
    );
    expect(removeEventListener).not.toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("preserves dirty state for an unsaved field owned by another step", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    renderPage();
    fillValidCore();
    await advanceToStep(3);
    fireEvent.click(screen.getByRole("checkbox", { name: "Facebook" }));
    await waitFor(() =>
      expect(addEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      ),
    );
    removeEventListener.mockClear();

    fireEvent.click(getProfileFormActionButton("Previous"));
    await screen.findByRole("heading", { name: bachelorSteps[1]!.title });
    await waitFor(() =>
      expect(getProfileFormActionButton("Continue")).toBeEnabled(),
    );
    fireEvent.click(getProfileFormActionButton("Continue"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: bachelorSteps[2]!.title }),
      ).toBeVisible(),
    );

    expect(removeEventListener).not.toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("finalizes a confirmation step without rendering profile details", async () => {
    const finalize = successfulFinalize("created-profile");
    renderPage({ finalize });
    fillValidCore();
    await advanceToStep(4);

    expect(
      screen.queryByRole("heading", { name: "Profile details" }),
    ).not.toBeInTheDocument();
    fireEvent.click(getProfileFormActionButton("Validate and finish"));
    await waitFor(() => expect(finalize).toHaveBeenCalledOnce());
    expect(finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        core: expect.objectContaining({ email: "student@example.com" }),
        enrollmateData: {},
      }),
    );
  });
});
