"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  PlayIcon,
  StepForwardIcon,
  UserRoundSearchIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  currentOperator,
  formatDurationMs,
  formatDurationSeconds,
  formatTimestamp,
  getE2eRunsForProfile,
  getNextE2eRunNumber,
  type E2eRunStepView,
  type E2eRunTestView,
  type E2eRunView,
  type E2eStepDefinitionView,
  type ProfileEnrollmentDataView,
  type ProfileView,
} from "@/lib/mock-testing-data";
import { MainShell } from "@/components/main-shell";

type EnrollmentField = { label: string; value: string | boolean | null };

export function E2eTestingClient({
  profiles,
  stepDefinitions,
  initialRuns,
}: {
  profiles: ProfileView[];
  stepDefinitions: E2eStepDefinitionView[];
  initialRuns: E2eRunView[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedProfileId = searchParams.get("profile");
  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const [runs, setRuns] = useState(initialRuns);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedStepCount, setSelectedStepCount] = useState(() => {
    const activeRun = initialRuns.find(
      (run) => run.profileId === selectedProfileId && run.status === "running",
    );
    return activeRun?.steps.length ?? stepDefinitions.length;
  });

  const orderedSteps = useMemo(
    () => [...stepDefinitions].sort((a, b) => a.sortOrder - b.sortOrder),
    [stepDefinitions],
  );
  const selectedProfileRuns = selectedProfile
    ? getE2eRunsForProfile(selectedProfile.id, runs)
    : [];
  const selectedRun =
    selectedProfileRuns.find((run) => run.id === selectedRunId) ?? null;
  const activeRun =
    selectedProfileRuns.find((run) => run.status === "running") ?? null;
  const effectiveStepCount =
    activeRun?.steps.length ?? Math.min(selectedStepCount, orderedSteps.length);
  const selectedSteps = orderedSteps.slice(0, effectiveStepCount);

  function openProfile(profileId: string) {
    const profileActiveRun = getE2eRunsForProfile(profileId, runs).find(
      (run) => run.status === "running",
    );
    setSelectedRunId(null);
    setSelectedStepCount(profileActiveRun?.steps.length ?? orderedSteps.length);
    router.push(`${pathname}?profile=${profileId}`);
  }

  function closeWorkspace() {
    setSelectedRunId(null);
    setSelectedStepCount(orderedSteps.length);
    router.push(pathname);
  }

  function handleProfileKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    profileId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openProfile(profileId);
  }

  function runAutomated() {
    if (!selectedProfile) return;
    const startedAt = new Date();
    const completedAt = new Date(startedAt.getTime() + 214_000);
    const run: E2eRunView = {
      id: crypto.randomUUID(),
      runNumber: getNextE2eRunNumber(selectedProfile.id, runs),
      profileId: selectedProfile.id,
      status: "completed",
      startedBy: currentOperator,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      steps: selectedSteps.map((step, index) =>
        createCompletedStep(step, index),
      ),
    };
    setRuns((current) => [run, ...current]);
    setSelectedRunId(run.id);
  }

  function runNextManualStep() {
    if (!selectedProfile) return;
    const activeRun = getE2eRunsForProfile(selectedProfile.id, runs).find(
      (run) => run.status === "running",
    );

    if (!activeRun) {
      const newRun: E2eRunView = {
        id: crypto.randomUUID(),
        runNumber: getNextE2eRunNumber(selectedProfile.id, runs),
        profileId: selectedProfile.id,
        status: selectedSteps.length <= 1 ? "completed" : "running",
        startedBy: currentOperator,
        startedAt: new Date().toISOString(),
        completedAt:
          selectedSteps.length <= 1 ? new Date().toISOString() : null,
        steps: selectedSteps.map((step, index) =>
          index === 0
            ? createCompletedStep(step, index, "manual")
            : createQueuedStep(step),
        ),
      };
      setRuns((current) => [newRun, ...current]);
      setSelectedRunId(newRun.id);
      return;
    }

    const nextQueuedIndex = activeRun.steps.findIndex(
      (step) => step.status === "queued",
    );
    if (nextQueuedIndex < 0) return;
    const isLastStep = nextQueuedIndex === activeRun.steps.length - 1;
    const updatedRun: E2eRunView = {
      ...activeRun,
      status: isLastStep ? "completed" : "running",
      completedAt: isLastStep ? new Date().toISOString() : null,
      steps: activeRun.steps.map((step, index) =>
        index === nextQueuedIndex
          ? createCompletedStep(
              orderedSteps.find((definition) => definition.id === step.stepId)!,
              index,
              "manual",
            )
          : step,
      ),
    };
    setRuns((current) =>
      current.map((run) => (run.id === updatedRun.id ? updatedRun : run)),
    );
    setSelectedRunId(updatedRun.id);
  }

  return (
    <MainShell
      title="End-to-End Testing"
      subtitle="Review enrollment-ready profiles, start complete test sessions, and trace results from run to assertion."
    >
      <section className="space-y-3" aria-labelledby="profiles-title">
        <div>
          <h2 id="profiles-title" className="text-lg font-medium">
            Test profiles
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose a profile to review enrollment data and run history.
          </p>
        </div>
        <Card className="overflow-hidden">
          {profiles.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latest run</TableHead>
                    <TableHead>
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => {
                    const latestRun =
                      getE2eRunsForProfile(profile.id, runs)[0] ?? null;
                    return (
                      <TableRow
                        key={profile.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        onClick={() => openProfile(profile.id)}
                        onKeyDown={(event) =>
                          handleProfileKeyDown(event, profile.id)
                        }
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{profile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {profile.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{profile.program}</TableCell>
                        <TableCell>{profile.cohort}</TableCell>
                        <TableCell>
                          <StatusBadge status={profile.status} />
                        </TableCell>
                        <TableCell>
                          {latestRun ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium tabular-nums">
                                #{latestRun.runNumber}
                              </span>
                              <StatusBadge status={latestRun.status} />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              No runs
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronRightIcon
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserRoundSearchIcon />
                </EmptyMedia>
                <EmptyTitle>No test profiles</EmptyTitle>
                <EmptyDescription>
                  Profiles will appear when fixtures or the future backend
                  provide them.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </Card>
      </section>

      <Sheet
        open={Boolean(selectedProfile)}
        onOpenChange={(open) => !open && closeWorkspace()}
      >
        <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-3xl">
          {selectedProfile ? (
            selectedRun ? (
              <RunDetails
                run={selectedRun}
                stepDefinitions={orderedSteps}
                onBack={() => setSelectedRunId(null)}
              />
            ) : (
              <ProfileWorkspace
                profile={selectedProfile}
                steps={orderedSteps}
                runs={selectedProfileRuns}
                selectedStepCount={effectiveStepCount}
                selectionLocked={Boolean(activeRun)}
                onSelectedStepCountChange={setSelectedStepCount}
                onAutomated={runAutomated}
                onManual={runNextManualStep}
                onSelectRun={setSelectedRunId}
              />
            )
          ) : null}
        </SheetContent>
      </Sheet>
    </MainShell>
  );
}

function ProfileWorkspace({
  profile,
  steps,
  runs,
  selectedStepCount,
  selectionLocked,
  onSelectedStepCountChange,
  onAutomated,
  onManual,
  onSelectRun,
}: {
  profile: ProfileView;
  steps: E2eStepDefinitionView[];
  runs: E2eRunView[];
  selectedStepCount: number;
  selectionLocked: boolean;
  onSelectedStepCountChange: (count: number) => void;
  onAutomated: () => void;
  onManual: () => void;
  onSelectRun: (id: string) => void;
}) {
  const activeRun = runs.find((run) => run.status === "running");
  const groups = getEnrollmentGroups(profile.enrollmentData);
  const selectedRange =
    selectedStepCount === 1 ? "Step 1" : `Steps 1–${selectedStepCount}`;
  return (
    <>
      <SheetHeader className="border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle>{profile.name}</SheetTitle>
          <StatusBadge status={profile.status} />
        </div>
        <SheetDescription>
          {profile.email} · {profile.program} · {profile.cohort}
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-7 px-4 pb-6">
        <section className="space-y-3" aria-labelledby="run-profile-title">
          <div>
            <h3 id="run-profile-title" className="font-medium">
              Start or continue a run
            </h3>
            <p className="text-sm text-muted-foreground">
              Runs {selectedRange} in order · {selectedStepCount} of{" "}
              {steps.length} selected.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={onAutomated}
              disabled={selectionLocked}
            >
              <PlayIcon className="size-4" />
              Run selected steps locally
            </Button>
            <Button type="button" variant="outline" onClick={onManual}>
              <StepForwardIcon className="size-4" />
              {activeRun
                ? `Advance run #${activeRun.runNumber}`
                : "Start manual run"}
            </Button>
          </div>
          <p id="step-selection-help" className="text-xs text-muted-foreground">
            {activeRun
              ? `Run #${activeRun.runNumber} is locked to ${selectedRange} until it completes.`
              : "Remove steps from the end of the sequence, or add the next excluded step."}
          </p>
          <ol className="space-y-2">
            {steps.map((step, index) => {
              const isSelected = index < selectedStepCount;
              const canRemove =
                isSelected &&
                index === selectedStepCount - 1 &&
                selectedStepCount > 1;
              const canAdd = !isSelected && index === selectedStepCount;
              const isDisabled = selectionLocked || (!canRemove && !canAdd);

              return (
                <li key={step.id}>
                  <label
                    className={`flex gap-3 rounded-lg border p-3 transition-colors ${isSelected ? "bg-muted/15" : "bg-muted/5 text-muted-foreground"} ${isDisabled ? "cursor-not-allowed" : "cursor-pointer hover:border-primary/35"}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      aria-describedby="step-selection-help"
                      onCheckedChange={() =>
                        onSelectedStepCountChange(
                          isSelected
                            ? selectedStepCount - 1
                            : selectedStepCount + 1,
                        )
                      }
                      className="mt-1"
                    />
                    <span className="flex min-w-0 flex-1 gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                        {step.sortOrder}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {step.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                          {step.description ?? "No description provided"}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {isSelected ? "Included" : "Excluded"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
        </section>

        <Separator />
        <section className="space-y-3" aria-labelledby="run-history-heading">
          <div>
            <h3 id="run-history-heading" className="font-medium">
              Run history
            </h3>
            <p className="text-sm text-muted-foreground">
              Open a run to inspect step and assertion results.
            </p>
          </div>
          {runs.length ? (
            <div className="divide-y rounded-lg border">
              {runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => onSelectRun(run.id)}
                  className="flex w-full items-center justify-between gap-4 p-3 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        Run #{run.runNumber}
                      </span>
                      <StatusBadge status={run.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {run.steps.length} of {steps.length} steps ·{" "}
                      {formatTimestamp(run.startedAt)} ·{" "}
                      {run.startedBy?.name ?? "System schedule"}
                    </p>
                  </div>
                  <ChevronRightIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No runs yet. Start an automated or manual local session.
            </p>
          )}
        </section>

        <Separator />
        <section className="space-y-4" aria-labelledby="enrollment-heading">
          <div>
            <h3 id="enrollment-heading" className="font-medium">
              Enrollment data
            </h3>
            <p className="text-sm text-muted-foreground">
              Read-only values that will populate the enrollment workflow.
            </p>
          </div>
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h4 className="text-sm font-medium">{group.label}</h4>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border bg-muted/10 p-4 sm:grid-cols-2">
                {group.fields.map((field) => (
                  <div key={field.label}>
                    <dt className="text-xs text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd className="mt-0.5 text-sm">
                      {formatFieldValue(field.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function RunDetails({
  run,
  stepDefinitions,
  onBack,
}: {
  run: E2eRunView;
  stepDefinitions: E2eStepDefinitionView[];
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
          {formatTimestamp(run.startedAt)} ·{" "}
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
              <StepResult
                key={step.id}
                step={step}
                definition={stepDefinitions.find(
                  (definition) => definition.id === step.stepId,
                )}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function StepResult({
  step,
  definition,
}: {
  step: E2eRunStepView;
  definition?: E2eStepDefinitionView;
}) {
  return (
    <article className="rounded-lg border">
      <div className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium">
            {definition
              ? `${definition.sortOrder}. ${definition.label}`
              : step.stepId}
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

function TestResult({ test }: { test: E2eRunTestView }) {
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

function createQueuedStep(step: E2eStepDefinitionView): E2eRunStepView {
  return {
    id: crypto.randomUUID(),
    stepId: step.id,
    status: "queued",
    durationSeconds: null,
    note: "Waiting for the preceding step.",
    tests: [],
  };
}

function createCompletedStep(
  step: E2eStepDefinitionView,
  index: number,
  mode: "automated" | "manual" = "automated",
): E2eRunStepView {
  return {
    id: crypto.randomUUID(),
    stepId: step.id,
    status: "success",
    durationSeconds: 38 + index * 9,
    note: `${step.label} completed through ${mode} local execution.`,
    tests: [
      {
        id: crypto.randomUUID(),
        testName: `${step.label} assertions pass`,
        status: "success",
        durationMs: 2200 + index * 380,
        errorMessage: null,
      },
    ],
  };
}

function getEnrollmentGroups(
  data: ProfileEnrollmentDataView,
): { label: string; fields: EnrollmentField[] }[] {
  return [
    {
      label: "Student",
      fields: [
        {
          label: "Name",
          value:
            [data.givenName, data.familyName].filter(Boolean).join(" ") || null,
        },
        { label: "Birthdate", value: data.birthdate },
        { label: "Birthplace", value: data.birthplace },
        { label: "Gender", value: data.gender },
        { label: "Nationality", value: data.nationality },
        { label: "Mobile", value: data.mobile },
        { label: "Civil status", value: data.civilStatus },
        { label: "Religion", value: data.religion },
      ],
    },
    {
      label: "Enrollment",
      fields: [
        { label: "Student type", value: data.studentType },
        { label: "Student status", value: data.studentStatus },
        { label: "Strand", value: data.strand },
        { label: "Last school", value: data.lastSchoolAttended },
        { label: "Term applied", value: data.termApplied },
        { label: "Program", value: data.programApplied },
        { label: "Learning hub", value: data.preferredLearningHub },
        { label: "Scholarship interest", value: data.interestedInScholarship },
      ],
    },
    {
      label: "Addresses",
      fields: [
        {
          label: "Current address",
          value: formatAddress(
            data.currentAddressLine1,
            data.currentAddressLine2,
            data.currentAddressBarangay,
            data.currentAddressCity,
            data.currentAddressProvince,
            data.currentAddressZipCode,
            data.currentAddressCountry,
          ),
        },
        {
          label: "Permanent address",
          value: formatAddress(
            data.permanentAddressLine1,
            data.permanentAddressLine2,
            data.permanentAddressBarangay,
            data.permanentAddressCity,
            data.permanentAddressProvince,
            data.permanentAddressZipCode,
            data.permanentAddressCountry,
          ),
        },
      ],
    },
    {
      label: "Guardian",
      fields: [
        {
          label: "Guardian",
          value:
            [
              data.guardianGivenName,
              data.guardianFamilyName,
              data.guardianSuffix,
            ]
              .filter(Boolean)
              .join(" ") || null,
        },
        { label: "Relationship", value: data.guardianRelationship },
        { label: "Mobile", value: data.guardianMobile },
        { label: "Email", value: data.guardianEmail },
        { label: "Occupation", value: data.guardianOccupation },
        { label: "Father status", value: data.fatherStatus },
        { label: "Mother status", value: data.motherStatus },
        { label: "Use student address", value: data.copyGuardianAddress },
      ],
    },
  ];
}

function formatAddress(...parts: (string | null)[]) {
  return parts.filter(Boolean).join(", ") || null;
}
function formatFieldValue(value: string | boolean | null) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value || "Not provided";
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
