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
      <ol className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] sm:overflow-visible sm:pb-0">
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
                "flex min-w-40 items-start gap-3 rounded-md border px-3 py-3 text-sm",
                isActive && "border-foreground bg-muted",
                isValidated && !isActive && "bg-muted/60",
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
              <span className="min-w-0 leading-6 font-medium text-foreground">
                {step.title}
              </span>
              {isValidated && <span className="sr-only">Validated</span>}
              {isActive && <span className="sr-only">Current step</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
