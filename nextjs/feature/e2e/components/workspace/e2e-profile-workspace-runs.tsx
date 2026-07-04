"use client";

import { ArrowLeftIcon } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatDurationMs,
  formatDurationSeconds,
  formatTimestamp,
} from "@/lib/mock-testing-data";
import {
  E2eRun,
  E2eRunStep,
  E2eRunTest,
} from "../../types/e2e-testing.types";

export default function E2eRunDetails({
  run,
  stepDefinitions,
  onBack,
}: {
  run: E2eRun;
  stepDefinitions: { length: number };
  onBack: () => void;
}) {
  const duration = run.completedAt
    ? Math.max(
        0,
        Math.round(
          (Date.parse(run.completedAt) - Date.parse(run.startedAt)) / 1000,
        ),
      )
    : null;

  return (
    <>
      <SheetHeader className="border-b pb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-2 w-fit -ml-2"
        >
          <ArrowLeftIcon className="size-4" />
          Back to profile
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle>Run #{run.runNumber}</SheetTitle>
          <StatusBadge status={run.status} />
        </div>
        <SheetDescription>
          {formatTimestamp(run.startedAt)} |{" "}
          {run.startedBy?.name ?? "System schedule"}
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/15 p-4 sm:grid-cols-5">
          <Metric
            label="Included"
            value={`${run.steps.length}/${stepDefinitions.length}`}
          />
          <Metric
            label="Passed"
            value={`${run.steps.filter((step) => step.status === "success").length}/${run.steps.length}`}
          />
          <Metric
            label="Failures"
            value={String(
              run.steps.filter((step) => step.status === "failure").length,
            )}
          />
          <Metric label="Duration" value={formatDurationSeconds(duration)} />
          <Metric label="Completed" value={formatTimestamp(run.completedAt)} />
        </dl>
        <section className="space-y-3" aria-labelledby="run-steps-heading">
          <div>
            <h3 id="run-steps-heading" className="font-medium">
              Step results
            </h3>
            <p className="text-sm text-muted-foreground">
              {run.steps.length} of {stepDefinitions.length} configured steps
              included. A completed session may still contain failed or skipped
              assertions.
            </p>
          </div>
          <div className="space-y-3">
            {run.steps.map((step) => (
              <StepResult key={step.id} step={step} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function StepResult({
  step,
}: {
  step: E2eRunStep;
}) {
  return (
    <article className="rounded-lg border">
      <div className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium">
            {step.e2eStep.sortOrder}. {step.e2eStep.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {step.note ?? "No execution note"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDurationSeconds(step.durationSeconds)}
          </span>
          <StatusBadge status={step.status} />
        </div>
      </div>
      {step.tests.length ? (
        <div className="border-t bg-muted/10 p-3">
          <div className="space-y-2">
            {step.tests.map((test) => (
              <TestResult key={test.id} test={test} />
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          No assertions recorded for this step.
        </div>
      )}
    </article>
  );
}

function TestResult({ test }: { test: E2eRunTest }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <p className="text-sm">{test.testName}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDurationMs(test.durationMs)}
          </span>
          <StatusBadge status={test.status} />
        </div>
      </div>
      {test.errorMessage ? (
        <p className="mt-2 rounded-md bg-red-500/10 p-2 text-xs text-red-200">
          {test.errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
