"use client";

import { type EnrollmateFlowType } from "@mihc/enrollmate-contract";
import { Fragment } from "react";

import { E2eProfileCoreFields } from "@/feature/e2e/components/profile-form/e2e-profile-core-fields";
import { E2eProfileFormActions } from "@/feature/e2e/components/profile-form/e2e-profile-form-actions";
import { E2eProfileFormProgress } from "@/feature/e2e/components/profile-form/e2e-profile-form-progress";
import { EnrollmateFieldRenderer } from "@/feature/e2e/components/profile-form/enrollmate-field-renderer";
import { EnrollmateSection } from "@/feature/e2e/components/profile-form/enrollmate-section";
import { Spinner } from "@/components/ui/spinner";
import type {
  E2eProfileFixture,
  E2eProfileFormEditorStep,
  FinalizeE2eProfileForm,
} from "@/feature/e2e/types/e2e-profile-form.types";
import { Separator } from "@/components/ui/separator";
import useE2eProfileFormController from "./use-e2e-profile-form-controller";

export type E2eProfileFormPageBaseProps = {
  flows: Record<EnrollmateFlowType, E2eProfileFormEditorStep[]>;
  isNavigating?: boolean;
  onFinish?: (profileId: string) => void;
};

export type E2eProfileFormPageProps = E2eProfileFormPageBaseProps & {
  fixtures: E2eProfileFixture[];
  finalize: FinalizeE2eProfileForm;
};

function ProfileFormErrorSummary({
  messages,
}: {
  messages: readonly string[];
}) {
  if (messages.length === 0) return null;

  return (
    <div
      id="e2e-profile-form-errors"
      role="alert"
      tabIndex={-1}
      className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
    >
      <p className="font-medium">Review the highlighted fields.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

function ProfileFormStepIntroduction({
  step,
}: {
  step: E2eProfileFormEditorStep;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-balance">{step.title}</h2>
      {step.sections.length === 0 && (
        <p className="max-w-2xl text-sm text-muted-foreground">
          Confirm the complete profile is valid before finishing.
        </p>
      )}
    </div>
  );
}

function ProfileFormLoadingState() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      role="status"
      aria-label="Finalizing profile"
    >
      <Spinner className="size-8 text-primary" />
    </div>
  );
}

export function E2eProfileFormPage({
  finalize,
  fixtures,
  flows,
  isNavigating = false,
  onFinish,
}: E2eProfileFormPageProps) {
  const controller = useE2eProfileFormController({
    finalize,
    fixtures,
    flows,
    onFinish,
  });
  const isPending = controller.isPending || isNavigating;

  if (controller.isFinalizing || isNavigating) {
    return <ProfileFormLoadingState />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 py-6">
      <E2eProfileFormProgress
        activeStep={controller.activeStepNumber}
        steps={controller.steps}
        validatedSteps={controller.validatedSteps}
      />

      <form
        className="space-y-8 rounded-lg border bg-card p-5 sm:p-7"
        aria-describedby={
          controller.errorMessages.length > 0
            ? "e2e-profile-form-errors"
            : undefined
        }
        onSubmit={(event) => event.preventDefault()}
      >
        <controller.form.AppForm>
          <E2eProfileFormActions
            canMockCurrentStep={controller.activeStep.sections.length > 0}
            currentStep={controller.activeStepNumber}
            totalSteps={controller.steps.length}
            placement="top"
            isPending={isPending}
            onMockCurrentStep={controller.mockCurrentStep}
            onPrevious={controller.goToPreviousStep}
            onContinue={() => void controller.continueToNextStep()}
            onFinalize={() => void controller.finalizeProfile()}
          />

          <fieldset
            disabled={isPending}
            className="space-y-8"
            onChangeCapture={controller.blockPendingFieldChange}
          >
            {controller.activeStepNumber === 1 && (
              <E2eProfileCoreFields form={controller.form} />
            )}

            <div className="space-y-6 border-t pt-7">
              <ProfileFormStepIntroduction step={controller.activeStep} />

              <controller.form.Subscribe
                selector={(state) => state.values.enrollmate}
              >
                {(values) => (
                  <div className="space-y-8">
                    {controller.activeStep.sections.map((section, index) => (
                      <Fragment key={section.id}>
                        {index > 0 && <Separator />}
                        <EnrollmateSection
                          section={section}
                          fixtures={fixtures}
                          values={values}
                          renderField={({ definition, fixtures, values }) => (
                            <controller.form.AppField
                              name={`enrollmate.${definition.name}`}
                            >
                              {(field) => (
                                <EnrollmateFieldRenderer
                                  boundField={field}
                                  definition={definition}
                                  fixtures={fixtures}
                                  values={values}
                                />
                              )}
                            </controller.form.AppField>
                          )}
                        />
                      </Fragment>
                    ))}
                  </div>
                )}
              </controller.form.Subscribe>
            </div>
          </fieldset>

          <ProfileFormErrorSummary messages={controller.errorMessages} />

          <E2eProfileFormActions
            canMockCurrentStep={controller.activeStep.sections.length > 0}
            currentStep={controller.activeStepNumber}
            totalSteps={controller.steps.length}
            placement="bottom"
            isPending={isPending}
            onMockCurrentStep={controller.mockCurrentStep}
            onPrevious={controller.goToPreviousStep}
            onContinue={() => void controller.continueToNextStep()}
            onFinalize={() => void controller.finalizeProfile()}
          />
        </controller.form.AppForm>
      </form>
    </div>
  );
}
