"use client";

import { useQueryState } from "nuqs";
import { useEffect } from "react";

import { stepParamKey, stepSearchParams } from "../e2e-testing.query-state";
import type { E2eProfileFormEditorStep } from "../../types/e2e-profile-form.types";
import { clampStep } from "./e2e-profile-form-validation";

export function useE2eProfileFormStep({
  steps,
}: {
  steps: readonly E2eProfileFormEditorStep[];
}) {
  const [queryStep, setQueryStep] = useQueryState(
    stepParamKey,
    stepSearchParams[stepParamKey],
  );
  const activeStepNumber = clampStep(queryStep, steps.length);
  const activeStep = steps[activeStepNumber - 1]!;

  useEffect(() => {
    if (queryStep === activeStepNumber) return;

    const timeout = window.setTimeout(() => {
      void setQueryStep(activeStepNumber);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeStepNumber, queryStep, setQueryStep]);

  function goTo(stepNumber: number) {
    return setQueryStep(clampStep(stepNumber, steps.length));
  }

  function goNext() {
    return goTo(activeStepNumber + 1);
  }

  function goPrevious() {
    return goTo(activeStepNumber - 1);
  }

  return {
    activeStep,
    activeStepNumber,
    goNext,
    goPrevious,
    goTo,
  };
}
