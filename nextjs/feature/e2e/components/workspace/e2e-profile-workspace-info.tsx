import { StatusBadge } from "@/components/status-badge";
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { formatTimestamp } from "@/lib/mock-testing-data";
import { PlayIcon, StepForwardIcon, ChevronRightIcon } from "lucide-react";
import {
  E2eProfileWorkspaceProfile,
  E2eStepDefinition,
  E2eRun,
  E2eProfileEnrollmentData,
} from "../../types/e2e-testing.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

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

export default function ProfileWorkspaceInfo({
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
  profile: E2eProfileWorkspaceProfile;
  steps: E2eStepDefinition[];
  runs: E2eRun[];
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
    selectedStepCount === 1 ? "Step 1" : `Steps 1-${selectedStepCount}`;

  function formatFieldValue(value: string | boolean | null) {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value || "Not provided";
  }

  return (
    <>
      <SheetHeader className="border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle>{profile.name}</SheetTitle>
          <StatusBadge status={profile.status} />
        </div>
        <SheetDescription>
          {profile.email} | {profile.program} | {profile.cohort}
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-7 px-4 pb-6">
        <section className="space-y-3" aria-labelledby="run-profile-title">
          <div>
            <h3 id="run-profile-title" className="font-medium">
              Start or continue a run
            </h3>
            <p className="text-sm text-muted-foreground">
              Runs {selectedRange} in order | {selectedStepCount} of{" "}
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
                      {run.steps.length} of {steps.length} steps |{" "}
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
