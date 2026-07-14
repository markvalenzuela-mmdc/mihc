"use client";

import { Button } from "@/components/ui/button";

type E2eProfileFormActionsProps = {
  canMockCurrentStep: boolean;
  currentStep: number;
  totalSteps: number;
  isPending: boolean;
  onMockCurrentStep: () => void;
  onPrevious: () => void;
  onContinue: () => void;
  onFinalize: () => void;
};

export function E2eProfileFormActions({
  canMockCurrentStep,
  currentStep,
  totalSteps,
  isPending,
  onMockCurrentStep,
  onPrevious,
  onContinue,
  onFinalize,
}: E2eProfileFormActionsProps) {
  const isConfirmationStep = currentStep === totalSteps;

  return (
    <div
      role="group"
      aria-label="Profile form actions"
      aria-busy={isPending}
      className="space-y-3 pt-6"
    >
      {isPending && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          Saving profile…
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={isPending || currentStep <= 1}
          onClick={onPrevious}
        >
          Previous
        </Button>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {canMockCurrentStep && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onMockCurrentStep}
            >
              Mock current step
            </Button>
          )}
          {isConfirmationStep ? (
            <Button type="button" disabled={isPending} onClick={onFinalize}>
              Validate and finish
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isPending}
              onClick={onContinue}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
