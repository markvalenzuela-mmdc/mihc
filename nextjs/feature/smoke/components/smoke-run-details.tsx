"use client";

import { StatusBadge } from "@/components/status-badge";
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { formatDurationSeconds, formatDurationMs } from "@/lib/utils";
import {
  SmokeTestRun,
  SmokeTestRunResults,
} from "../types/smoke-test-apps.types";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";

export default function SmokeRunDetails({
  appName,
  details,
  results,
}: {
  appName: string;
  details: SmokeTestRun;
  results: SmokeTestRunResults[];
}) {
  const duration = () => {
    switch (details.status) {
      case "queued":
        return "Queued";
      case "running":
        return "In progress";
      default:
        return formatDurationSeconds(details.durationSeconds ?? 0);
    }
  };

  return (
    <>
      <SheetHeader className="border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle>
            {appName} · Run #{details.runNumber}
          </SheetTitle>
          <StatusBadge status={details.status} />
        </div>
        <SheetDescription>
          {format(details.checkedAt, "MMM d, yyyy 'at' h:mm a")} ·{" "}
          {details.trigger} trigger
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/15 p-4 sm:grid-cols-4">
          <Metric label="Passed" value={`${details.passed}/${details.total}`} />
          <Metric label="Failed" value={String(details.failed)} />
          <Metric label="Duration" value={duration()} />
          <Metric
            label="Started by"
            value={details.startedBy ?? "System schedule"}
          />
        </dl>

        <section className="space-y-3" aria-labelledby="smoke-tests-title">
          <div>
            <h3 id="smoke-tests-title" className="font-medium">
              Test results
            </h3>
            <p className="text-sm text-muted-foreground">
              Assertions captured for this smoke run.
            </p>
          </div>
          <div className="space-y-2">
            {details.status === "queued" && results.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Waiting for an execution slot…
              </div>
            ) : null}
            {details.status === "running" && results.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <Spinner />
                <p>Waiting for test results…</p>
              </div>
            ) : null}
            {results.map((test) => (
              <article key={test.id} className="rounded-lg border p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <h4 className="text-sm font-medium">{test.testName}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {test.testFile ?? "Test file unavailable"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatDurationMs(test.durationMs ?? 0)}
                    </span>
                    <StatusBadge status={test.status} />
                  </div>
                </div>
                {test.errorMessage ? (
                  <div className="mt-3 rounded-md bg-red-500/10 p-3 text-sm text-red-200">
                    <p className="whitespace-pre-wrap">{test.errorMessage}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
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
