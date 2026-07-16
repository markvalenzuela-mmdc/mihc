"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { E2eProfileMockMode } from "@/feature/e2e/types/e2e-profile-form.types";

type E2eProfileFormActionsProps = {
  canMockCurrentStep: boolean;
  currentStep: number;
  totalSteps: number;
  placement?: "top" | "bottom";
  isPending: boolean;
  onMockCurrentStep: (mode: E2eProfileMockMode) => void;
  onPrevious: () => void;
  onContinue: () => void;
  onFinalize: () => void;
};

export function E2eProfileFormActions({
  canMockCurrentStep,
  currentStep,
  totalSteps,
  placement = "bottom",
  isPending,
  onMockCurrentStep,
  onPrevious,
  onContinue,
  onFinalize,
}: E2eProfileFormActionsProps) {
  const [isMockDialogOpen, setIsMockDialogOpen] = useState(false);
  const isConfirmationStep = currentStep === totalSteps;
  const isTopPlacement = placement === "top";

  function chooseMockMode(mode: E2eProfileMockMode) {
    setIsMockDialogOpen(false);
    onMockCurrentStep(mode);
  }

  return (
    <div
      role="group"
      aria-label={
        isTopPlacement ? "Top profile form actions" : "Profile form actions"
      }
      className={isTopPlacement ? "space-y-3 pb-6" : "space-y-3 pt-6"}
    >
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
            <Dialog
              open={isMockDialogOpen}
              onOpenChange={setIsMockDialogOpen}
            >
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setIsMockDialogOpen(true)}
              >
                Mock current step
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mock current step</DialogTitle>
                  <DialogDescription>
                    Choose how to populate this step. Mocking only changes the
                    current form values; it does not save or finalize the
                    profile.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsMockDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => chooseMockMode("partial")}
                  >
                    Random partial fill
                  </Button>
                  <Button
                    type="button"
                    onClick={() => chooseMockMode("full")}
                  >
                    Fill all fields
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {isConfirmationStep ? (
            <Button
              type="button"
              disabled={isPending}
              onClick={onFinalize}
            >
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
