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
  E2eProfileFormValues,
  FinalizeE2eProfileForm,
  SaveE2eProfileDraft,
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
const validInitialValues: E2eProfileFormValues = {
  ...e2eProfileFormOptions.defaultValues,
  core: {
    ...e2eProfileFormOptions.defaultValues.core,
    name: "Example Student",
    email: "student@example.com",
  },
  enrollmate: {
    ...e2eProfileFormOptions.defaultValues.enrollmate,
    fthrDeceased: "Living",
    mthrDeceased: "Living",
  },
};

function successfulDraft(profileId = "profile-1"): SaveE2eProfileDraft {
  return vi.fn(async (input) => ({
    ok: true as const,
    data: { profileId, nextStep: input.stepNumber + 1 },
  }));
}

function successfulFinalize(): FinalizeE2eProfileForm {
  return vi.fn(async (input) => ({
    ok: true as const,
    data: { profileId: input.profileId },
  }));
}

function renderPage({
  finalize = successfulFinalize(),
  onExit,
  onFinish,
  onUrlUpdate,
  initialValues,
  saveDraft = successfulDraft(),
  searchParams,
}: {
  finalize?: FinalizeE2eProfileForm;
  onExit?: (profileId: string) => void;
  onFinish?: (profileId: string) => void;
  onUrlUpdate?: (event: UrlUpdateEvent) => void;
  initialValues?: E2eProfileFormValues;
  saveDraft?: SaveE2eProfileDraft;
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
        initialValues={initialValues}
        fixtures={fixtures}
        saveDraft={saveDraft}
        finalize={finalize}
        onExit={onExit}
        onFinish={onFinish}
      />
    </NuqsTestingAdapter>,
  );
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

async function chooseFixtureOption(controlName: string, optionName: string) {
  const input = screen.getByRole("combobox", { name: controlName });
  const inputGroup = input.closest('[data-slot="input-group"]');
  if (!(inputGroup instanceof HTMLElement)) {
    throw new Error(`${controlName} is missing its input group`);
  }
  fireEvent.click(within(inputGroup).getByRole("button"));
  fireEvent.click(await screen.findByRole("option", { name: optionName }));
}

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

  it("keeps an invalid active step in place and focuses its first error", async () => {
    contractValidation.stepSafeParse.mockReturnValue({
      success: false,
      error: {
        issues: [{ path: ["email"], message: "Email is required." }],
      },
    });
    const saveDraft = successfulDraft();
    renderPage({ saveDraft });
    fillValidCore();

    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));

    expect(await screen.findAllByText("Email is required.")).not.toHaveLength(0);
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("name", "enrollmate.email"),
    );
    expect(saveDraft).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole("navigation", {
        name: "Profile creation progress",
      })).getByText(bachelorSteps[0]!.title).closest("li"),
    ).toHaveAttribute("aria-current", "step");
  });

  it("saves only active-step keys, advances, stores the profile, and locks flow", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const saveDraft = successfulDraft("saved-profile");
    renderPage({ onUrlUpdate, saveDraft });
    fillValidCore();

    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledOnce());
    const firstInput = vi.mocked(saveDraft).mock.calls[0]![0];
    const expectedKeys = bachelorSteps[0]!.sections.flatMap((section) =>
      section.fields.map((field) => field.name),
    );
    expect(firstInput).toMatchObject({
      mode: "create",
      stepNumber: 1,
      core: {
        name: "Example Student",
        email: "student@example.com",
        flowType: "bachelors",
      },
    });
    const validatedValues = contractValidation.stepSafeParse.mock.calls[0]![0];
    const expectedAvailableKeys = expectedKeys.filter((fieldName) =>
      Object.hasOwn(validatedValues, fieldName),
    );
    expect(Object.keys(firstInput.stepData).sort()).toEqual(
      expectedAvailableKeys.sort(),
    );
    expect(Object.keys(firstInput.stepData).every((fieldName) =>
      expectedKeys.includes(fieldName),
    )).toBe(true);
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

  it("moves backward without submitting and exits only after a successful draft", async () => {
    const saveDraft = successfulDraft();
    const onExit = vi.fn();
    renderPage({
      initialValues: validInitialValues,
      onExit,
      saveDraft,
      searchParams: "?step=2",
    });

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() =>
      expect(
        within(screen.getByRole("navigation", {
          name: "Profile creation progress",
        })).getByText(bachelorSteps[0]!.title).closest("li"),
      ).toHaveAttribute("aria-current", "step"),
    );
    expect(saveDraft).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save draft and exit" }));
    await waitFor(() => expect(onExit).toHaveBeenCalledWith("profile-1"));
    expect(saveDraft).toHaveBeenCalledOnce();
  });

  it("preserves values and exposes injected field errors", async () => {
    const saveDraft: SaveE2eProfileDraft = vi.fn(async () => ({
      ok: false as const,
      error: { "core.email": ["A profile already uses this email."] },
    }));
    renderPage({ saveDraft });
    fillValidCore();

    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));

    expect(
      await screen.findAllByText("A profile already uses this email."),
    ).not.toHaveLength(0);
    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue(
      "Example Student",
    );
    expect(screen.getAllByRole("textbox", { name: "Email" })[0]).toHaveValue(
      "student@example.com",
    );
  });

  it("prevents duplicate submissions while a draft is pending", async () => {
    let resolveDraft: ((result: Awaited<ReturnType<SaveE2eProfileDraft>>) => void) | undefined;
    const saveDraft: SaveE2eProfileDraft = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<SaveE2eProfileDraft>>>((resolve) => {
          resolveDraft = resolve;
        }),
    );
    renderPage({
      initialValues: validInitialValues,
      saveDraft,
      searchParams: "?step=2",
    });
    const fatherName = screen.getByRole("textbox", {
      name: "Father First name",
    });
    fireEvent.change(fatherName, { target: { value: "Existing Father" } });
    const continueButton = screen.getByRole("button", {
      name: "Save and continue",
    });

    fireEvent.click(continueButton);
    fireEvent.click(continueButton);
    fireEvent.change(fatherName, { target: { value: "Changed while pending" } });
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledOnce());
    expect(continueButton).toBeDisabled();
    expect(fatherName).toBeDisabled();
    expect(fatherName).toHaveValue("Existing Father");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(
      within(screen.getByRole("navigation", {
        name: "Profile creation progress",
      })).getByText(bachelorSteps[1]!.title).closest("li"),
    ).toHaveAttribute("aria-current", "step");
    resolveDraft?.({
      ok: true,
      data: { profileId: "profile-1", nextStep: 2 },
    });
    await waitFor(() => expect(continueButton).toBeEnabled());
    expect(
      within(screen.getByRole("navigation", {
        name: "Profile creation progress",
      })).getByText(bachelorSteps[1]!.title).closest("li"),
    ).toHaveAttribute("aria-current", "step");
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
    const saveDraft = successfulDraft();
    renderPage({ saveDraft });
    fillValidCore();

    await chooseOption(medicalQuestion, "Yes");
    await chooseFixtureOption("Doctor's Report", "sample.pdf");
    await chooseOption(medicalQuestion, "No");
    await waitFor(() =>
      expect(
        screen.queryByRole("combobox", { name: "Doctor's Report" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledOnce());
    expect(contractValidation.stepSafeParse).toHaveBeenCalledWith(
      expect.not.objectContaining({ DR: expect.anything() }),
    );
    expect(vi.mocked(saveDraft).mock.calls[0]![0].stepData).not.toHaveProperty(
      "DR",
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
    vi.mocked(getEnrollmateStepValidator).mockImplementationOnce(
      (flowType, stepNumber) =>
        contractValidation.realGetStepValidator!(flowType, stepNumber) as ReturnType<
          typeof getEnrollmateStepValidator
        >,
    );
    renderPage({ initialValues: validInitialValues, searchParams: "?step=4" });

    fireEvent.click(
      screen.getByRole("button", { name: "Validate and finish" }),
    );

    expect(getEnrollmateStepValidator).toHaveBeenCalledWith("bachelors", 4);
    expect(
      await screen.findByText(
        "Save at least one profile step before validating the complete draft.",
      ),
    ).toBeVisible();
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
    const saveDraft = successfulDraft("micro-profile");
    const finalize = successfulFinalize();
    const onFinish = vi.fn();
    renderPage({ finalize, onFinish, saveDraft });
    fillValidCore();
    await chooseFlow("Microcredential");

    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    await screen.findByRole("heading", {
      name: microcredentialSteps[1]!.title,
    });
    const continueButton = screen.getByRole("button", {
      name: "Save and continue",
    });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    const validateButton = await screen.findByRole("button", {
      name: "Validate and finish",
    });
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
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute(
        "name",
        "enrollmate.givenName",
      ),
    );

    contractValidation.fullSafeParse.mockReturnValue({
      success: true,
      data: {},
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save and continue" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    await screen.findByRole("heading", {
      name: microcredentialSteps[1]!.title,
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save and continue" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    const finalValidateButton = await screen.findByRole("button", {
      name: "Validate and finish",
    });
    await waitFor(() => expect(finalValidateButton).toBeEnabled());
    fireEvent.click(finalValidateButton);
    await waitFor(() => expect(finalize).toHaveBeenCalledOnce());
    expect(finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: "micro-profile",
        core: expect.objectContaining({ flowType: "microcredentials" }),
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

  it("marks persisted core and active-step fields pristine after a draft save", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));

    await waitFor(() =>
      expect(removeEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      ),
    );
  });

  it("preserves dirty state for an unsaved field owned by another step", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    renderPage({ initialValues: validInitialValues, searchParams: "?step=3" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Facebook" }));
    await waitFor(() =>
      expect(addEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      ),
    );
    removeEventListener.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await screen.findByRole("heading", { name: bachelorSteps[1]!.title });
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    await waitFor(() => expect(screen.getByRole("status")).toBeVisible());
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );

    expect(removeEventListener).not.toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("finalizes a confirmation step without rendering profile details", async () => {
    const saveDraft = successfulDraft();
    const finalize = successfulFinalize();
    renderPage({
      finalize,
      initialValues: validInitialValues,
      saveDraft,
      searchParams: "?step=4",
    });

    expect(
      screen.queryByRole("heading", { name: "Profile details" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save draft and exit" }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Validate and finish" }));
    await waitFor(() => expect(finalize).toHaveBeenCalledOnce());
  });
});
