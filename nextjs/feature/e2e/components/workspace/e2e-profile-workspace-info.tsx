import { StatusBadge } from "@/components/status-badge";
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { formatTimestamp } from "@/lib/utils";
import {
  PlayIcon,
  StepForwardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { PageNumberPaginationMeta } from "@/lib/drizzle/pagination";
import {
  E2eProfileWorkspaceProfile,
  E2eStepDefinition,
  E2eRunHistoryItem,
  E2eProfileEnrollmentData,
} from "../../types/e2e-testing.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type EnrollmentField = { label: string; value: string | boolean | null };

function getEnrollmentGroups(
  data: E2eProfileEnrollmentData,
): { label: string; fields: EnrollmentField[] }[] {
  function formatAddress(...parts: (string | null)[]) {
    return parts.filter(Boolean).join(", ") || null;
  }

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

function RunHistorySkeleton() {
  return (
    <>
      <div className="divide-y rounded-lg border" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 p-3"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="size-4 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
      <div
        className="flex items-center justify-between gap-3"
        aria-hidden="true"
      >
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </>
  );
}

export function ProfileWorkspaceHeader({
  profile,
}: {
  profile: E2eProfileWorkspaceProfile;
}) {
  return (
    <SheetHeader className="border-b pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <SheetTitle>{profile.name}</SheetTitle>
        <StatusBadge status={profile.status} />
      </div>
      <SheetDescription>
        {profile.email} | {profile.program} | {profile.cohort}
      </SheetDescription>
    </SheetHeader>
  );
}

export function ProfileWorkspaceControls({
  steps,
  activeRun,
  selectedStepCount,
  selectionLocked,
  onSelectedStepCountChange,
  onAutomated,
  onManual,
}: {
  steps: E2eStepDefinition[];
  activeRun: E2eRunHistoryItem | null;
  selectedStepCount: number;
  selectionLocked: boolean;
  onSelectedStepCountChange: (count: number) => void;
  onAutomated: () => void;
  onManual: () => void;
}) {
  const selectedRange =
    selectedStepCount === 1 ? "Step 1" : `Steps 1-${selectedStepCount}`;
  return (
    <section className="space-y-3" aria-labelledby="run-profile-title">
      <div>
        <h3 id="run-profile-title" className="font-medium">
          Start or continue a run
        </h3>
        <p className="text-sm text-muted-foreground">
          Runs {selectedRange} in order | {selectedStepCount} of {steps.length}{" "}
          selected.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onAutomated} disabled={selectionLocked}>
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
        <ProfileWorkspaceControlsStepSelector
          steps={steps}
          selectedStepCount={selectedStepCount}
          selectionLocked={selectionLocked}
          onSelectedStepCountChange={onSelectedStepCountChange}
        />
      </ol>
    </section>
  );
}

function ProfileWorkspaceControlsStepSelector({
  steps,
  selectedStepCount,
  selectionLocked,
  onSelectedStepCountChange,
}: {
  steps: E2eStepDefinition[];
  selectedStepCount: number;
  selectionLocked: boolean;
  onSelectedStepCountChange: (count: number) => void;
}) {
  return steps.map((step, index) => {
    const isSelected = index < selectedStepCount;
    const canRemove =
      isSelected && index === selectedStepCount - 1 && selectedStepCount > 1;
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
                isSelected ? selectedStepCount - 1 : selectedStepCount + 1,
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
  });
}

export function ProfileWorkspaceRunHistory({
  runs,
  runPagination,
  isRunHistoryLoading,
  isRunHistoryFetching,
  isRunHistoryError,
  onSelectRun,
  onSelectRunPage,
}: {
  runs: E2eRunHistoryItem[];
  runPagination: PageNumberPaginationMeta | null;
  isRunHistoryLoading: boolean;
  isRunHistoryFetching: boolean;
  isRunHistoryError: boolean;
  onSelectRun: (run: E2eRunHistoryItem) => void;
  onSelectRunPage: (page: number) => void;
}) {
  return (
    <section className="space-y-3" aria-labelledby="run-history-heading">
      <div>
        <h3 id="run-history-heading" className="font-medium">
          Run history
        </h3>
        <p className="text-sm text-muted-foreground">
          Open a run to inspect step and assertion results.
        </p>
        {runPagination && runPagination.totalCount > 5 ? (
          <p className="text-xs text-muted-foreground">
            Showing {runs.length} of {runPagination.totalCount} runs.
          </p>
        ) : null}
      </div>
      {isRunHistoryError ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-destructive">
          Could not load run history.
        </p>
      ) : isRunHistoryLoading || isRunHistoryFetching ? (
        <RunHistorySkeleton />
      ) : runs.length ? (
        <>
          <div className="divide-y rounded-lg border">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRun(run)}
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
                    {formatTimestamp(run.startedAt)} |{" "}
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
          {runPagination && runPagination.pageCount > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRunHistoryFetching || !runPagination.previousPage}
                onClick={() => {
                  if (runPagination.previousPage) {
                    onSelectRunPage(runPagination.previousPage);
                  }
                }}
              >
                <ChevronLeftIcon className="size-4" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {runPagination.currentPage} of {runPagination.pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRunHistoryFetching || !runPagination.nextPage}
                onClick={() => {
                  if (runPagination.nextPage) {
                    onSelectRunPage(runPagination.nextPage);
                  }
                }}
              >
                Next
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No runs yet. Start an automated or manual local session.
        </p>
      )}
    </section>
  );
}

export function ProfileWorkspaceEnrollmentData({
  profile,
}: {
  profile: E2eProfileWorkspaceProfile;
}) {
  const groups = getEnrollmentGroups(profile.enrollmentData);
  function formatFieldValue(value: string | boolean | null) {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value || "Not provided";
  }
  return (
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
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="mt-0.5 text-sm">
                  {formatFieldValue(field.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}
