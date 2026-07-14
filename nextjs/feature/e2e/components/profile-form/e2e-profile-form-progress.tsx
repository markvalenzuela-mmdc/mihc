import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type E2eProfileFormProgressStep = {
  step: number;
  title: string;
};

type E2eProfileFormProgressProps = {
  activeStep: number;
  steps: readonly E2eProfileFormProgressStep[];
  validatedSteps: ReadonlySet<number>;
};

export function E2eProfileFormProgress({
  activeStep,
  steps,
  validatedSteps,
}: E2eProfileFormProgressProps) {
  return (
    <nav aria-label="Profile creation progress">
      <ol className="grid gap-2 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:overflow-hidden sm:rounded-lg sm:border sm:bg-card">
        {steps.map((step) => {
          const isActive = step.step === activeStep;
          const isValidated = validatedSteps.has(step.step);
          const state = isActive
            ? "current"
            : isValidated
              ? "validated"
              : "upcoming";

          return (
            <li
              key={step.step}
              aria-current={isActive ? "step" : undefined}
              data-state={state}
              data-validated={isValidated || undefined}
              className={cn(
                "flex min-w-0 items-start gap-3 rounded-md border px-3 py-3 text-sm sm:rounded-none sm:border-0 sm:px-4 sm:py-4",
                isActive && "border-foreground bg-muted sm:bg-muted/80",
                isValidated && !isActive && "bg-muted/50",
                !isActive && !isValidated && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  isActive && "border-foreground bg-foreground text-background",
                  isValidated &&
                    !isActive &&
                    "border-foreground bg-background text-foreground",
                )}
                aria-hidden="true"
              >
                {isValidated ? (
                  <Check className="size-3.5" />
                ) : (
                  step.step
                )}
              </span>
              <span className="min-w-0">
                <span className="block leading-5 font-medium text-foreground">
                  {step.title}
                </span>
                {isActive && (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    Current step
                  </span>
                )}
              </span>
              {isValidated && <span className="sr-only">Validated</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
