"use client";

import { type EnrollmateFlowType } from "@mihc/enrollmate-contract";
import { Fragment, useEffect, useState } from "react";

import { E2eProfileCoreFields } from "@/feature/e2e/components/profile-form/e2e-profile-core-fields";
import { E2eProfileFormActions } from "@/feature/e2e/components/profile-form/e2e-profile-form-actions";
import { E2eProfileFormProgress } from "@/feature/e2e/components/profile-form/e2e-profile-form-progress";
import { EnrollmateFieldRenderer } from "@/feature/e2e/components/profile-form/enrollmate-field-renderer";
import { EnrollmateSection } from "@/feature/e2e/components/profile-form/enrollmate-section";
import { createInMemoryE2eProfileFormMock } from "@/feature/e2e/mocks/e2e-profile-form.mock";
import type {
  E2eProfileFixture,
  E2eProfileFormEditorStep,
  E2eProfileFormValues,
  FinalizeE2eProfileForm,
  SaveE2eProfileDraft,
} from "@/feature/e2e/types/e2e-profile-form.types";
import { Separator } from "@/components/ui/separator";
import useE2eProfileFormController from "./use-e2e-profile-form-controller";

export type E2eProfileFormPageBaseProps = {
  flows: Record<EnrollmateFlowType, E2eProfileFormEditorStep[]>;
  initialValues?: E2eProfileFormValues;
  onExit?: (profileId: string) => void;
  onFinish?: (profileId: string) => void;
};

export type E2eProfileFormPageProps = E2eProfileFormPageBaseProps &
  (
    | {
        fixtures: E2eProfileFixture[];
        saveDraft: SaveE2eProfileDraft;
        finalize: FinalizeE2eProfileForm;
      }
    | {
        fixtures?: never;
        saveDraft?: never;
        finalize?: never;
      }
  );

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
          Confirm the complete profile is valid before finishing this draft.
        </p>
      )}
    </div>
  );
}

export function E2eProfileFormPage({
  finalize: injectedFinalize,
  fixtures: injectedFixtures,
  flows,
  initialValues,
  onExit,
  onFinish,
  saveDraft: injectedSaveDraft,
}: E2eProfileFormPageProps) {
  const hasInjectedBoundary =
    injectedFixtures !== undefined &&
    injectedSaveDraft !== undefined &&
    injectedFinalize !== undefined;
  const [mock] = useState(() =>
    hasInjectedBoundary ? null : createInMemoryE2eProfileFormMock(),
  );

  const boundary = hasInjectedBoundary
    ? {
        fixtures: injectedFixtures,
        saveDraft: injectedSaveDraft,
        finalize: injectedFinalize,
      }
    : mock!;

  useEffect(() => {
    return () => mock?.dispose();
  }, [mock]);

  const controller = useE2eProfileFormController({
    finalize: boundary.finalize,
    flows,
    initialValues,
    onExit,
    onFinish,
    saveDraft: boundary.saveDraft,
  });

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
          <ProfileFormErrorSummary messages={controller.errorMessages} />

          <fieldset
            disabled={controller.isPending}
            className="space-y-8"
            onChangeCapture={controller.blockPendingFieldChange}
          >
            {controller.activeStepNumber === 1 && (
              <E2eProfileCoreFields
                form={controller.form}
                isFlowLocked={controller.isFlowLocked}
              />
            )}

            <div className="space-y-6 border-t pt-7">
              <ProfileFormStepIntroduction step={controller.activeStep} />

              <controller.form.Subscribe
                selector={(state) => state.values.enrollmate}
              >
                {(values) => (
                  <div className="space-y-8">
                    {controller.activeStep.sections.map((section) => (
                      <Fragment key={section.id}>
                        <EnrollmateSection
                          section={section}
                          fixtures={boundary.fixtures}
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
                        <Separator />
                      </Fragment>
                    ))}
                  </div>
                )}
              </controller.form.Subscribe>
            </div>
          </fieldset>

          <E2eProfileFormActions
            currentStep={controller.activeStepNumber}
            totalSteps={controller.steps.length}
            isPending={controller.isPending}
            onPrevious={controller.goToPreviousStep}
            onSaveAndContinue={() => void controller.runDraft("continue")}
            onSaveAndExit={() => void controller.runDraft("exit")}
            onFinalize={() => void controller.finalizeProfile()}
          />
        </controller.form.AppForm>
      </form>
    </div>
  );
}
