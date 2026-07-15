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
import { memo, useMemo } from "react";
import { PageNumberPaginationMeta } from "@/lib/drizzle/pagination";
import {
  E2eProfileWorkspaceProfile,
  E2eStepDefinition,
  E2eRunHistoryItem,
} from "../../types/e2e-testing.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getProfileSheetGroups,
  type ProfileSheetGroup,
  type ProfileSheetFieldValue,
} from "./e2e-profile-sheet-groups";

const FIRST_COLLAPSIBLE_PROFILE_SHEET_GROUP_LABEL = "Current Address";

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle>{profile.name}</SheetTitle>
          <StatusBadge status={profile.status} />
        </div>
      </div>
      <SheetDescription>
        {profile.email} | {profile.flowType}
      </SheetDescription>
    </SheetHeader>
  );
}

export function ProfileWorkspaceControls({
  steps,
  activeRun,
  selectedStepCount,
  selectionLocked,
  canRun,
  isAutomatedPending,
  onSelectedStepCountChange,
  onAutomated,
  onManual,
}: {
  steps: E2eStepDefinition[];
  activeRun: E2eRunHistoryItem | null;
  selectedStepCount: number;
  selectionLocked: boolean;
  canRun: boolean;
  isAutomatedPending: boolean;
  onSelectedStepCountChange: (count: number) => void;
  onAutomated: (stepIds: string[]) => void;
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
        <Button
          type="button"
          onClick={() =>
            onAutomated(
              steps.slice(0, selectedStepCount).map((step) => step.id),
            )
          }
          disabled={selectionLocked || !canRun || isAutomatedPending}
        >
          <PlayIcon className="size-4" />
          Run selected steps automatically
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onManual}
          disabled={!canRun}
        >
          <StepForwardIcon className="size-4" />
          {activeRun
            ? `Advance run #${activeRun.runNumber}`
            : "Start manual run"}
        </Button>
      </div>
      <p id="step-selection-help" className="text-xs text-muted-foreground">
        {!canRun
          ? "This profile has no active validated application to run."
          : activeRun
            ? `Run #${activeRun.runNumber} is locked to ${selectedRange} until it completes.`
            : "Only step 1 is currently available for automatic runs."}
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
    const isDisabled =
      selectionLocked || index > 0 || (!canRemove && !canAdd);

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
          No runs yet. Start an automated or manual session.
        </p>
      )}
    </section>
  );
}

const ProfileSheetGroupCard = memo(function ProfileSheetGroupCard({
  group,
}: {
  group: ProfileSheetGroup;
}) {
  function formatProfileSheetFieldValue(value: ProfileSheetFieldValue) {
    if (value == null || value === "") return "Not provided";

    if (value instanceof Date) return value.toISOString();

    if (typeof value === "boolean") return value ? "Yes" : "No";

    return String(value);
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{group.label}</h4>
      <div className="rounded-lg border bg-muted/10 p-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {group.fields.map((field) => (
            <div key={`${group.label}-${field.label}`}>
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="mt-0.5 text-sm">
                {formatProfileSheetFieldValue(field.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
});

export function ProfileWorkspaceEnrollmentData({
  profile,
}: {
  profile: E2eProfileWorkspaceProfile;
}) {
  const { visibleGroups, collapsibleGroups } = useMemo(() => {
    const groups = getProfileSheetGroups(profile);
    const firstCollapsedGroupIndex = groups.findIndex(
      (group) => group.label === FIRST_COLLAPSIBLE_PROFILE_SHEET_GROUP_LABEL,
    );

    if (firstCollapsedGroupIndex === -1) {
      return {
        visibleGroups: groups,
        collapsibleGroups: [],
      };
    }

    return {
      visibleGroups: groups.slice(0, firstCollapsedGroupIndex),
      collapsibleGroups: groups.slice(firstCollapsedGroupIndex),
    };
  }, [profile]);

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
      {visibleGroups.map((group) => (
        <ProfileSheetGroupCard key={group.label} group={group} />
      ))}
      {collapsibleGroups.length ? (
        <Collapsible className="space-y-4">
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-lg border bg-muted/10 p-4 text-left text-sm font-medium outline-none transition-colors hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
            <span>Detailed enrollment data</span>
            <ChevronRightIcon
              className="size-4 shrink-0 text-muted-foreground transition-transform group-aria-expanded:rotate-90"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-4">
              {collapsibleGroups.map((group) => (
                <ProfileSheetGroupCard key={group.label} group={group} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </section>
  );
}
