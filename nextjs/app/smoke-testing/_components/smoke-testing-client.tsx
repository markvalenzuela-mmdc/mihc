"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import {
  ChevronRightIcon,
  CircleGaugeIcon,
  PlayIcon,
  TestTube2Icon,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  getNextSmokeRunNumber,
  getSmokeAppSummary,
  getSmokeRunsForApp,
  type SmokeAppView,
  type SmokeRunStatus,
  type SmokeRunView,
} from "@/lib/mock-testing-data";
import { cn } from "@/lib/utils";
import { MainShell } from "@/components/main-shell";

type FilterValue = "all" | SmokeRunStatus;

const filters: FilterValue[] = ["all", "success", "degraded", "failure"];

export function SmokeTestingClient({
  apps,
  initialRuns,
}: {
  apps: SmokeAppView[];
  initialRuns: SmokeRunView[];
}) {
  const [selectedAppId, setSelectedAppId] = useState(apps[0]?.id ?? "");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [runs, setRuns] = useState(initialRuns);

  const selectedApp =
    apps.find((app) => app.id === selectedAppId) ?? apps[0] ?? null;
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;
  const selectedRuns = useMemo(() => {
    if (!selectedApp) return [];
    return getSmokeRunsForApp(selectedApp.id, runs).filter(
      (run) => filter === "all" || run.status === filter,
    );
  }, [filter, runs, selectedApp]);

  function selectApp(appId: string) {
    setSelectedAppId(appId);
    setSelectedRunId(null);
  }

  function openRun(runId: string) {
    setSelectedRunId(runId);
  }

  function handleRunKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    runId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openRun(runId);
  }

  function runManualSmokeTest() {
    if (!selectedApp) return;

    const now = new Date().toISOString();
    const nextRun: SmokeRunView = {
      id: crypto.randomUUID(),
      runNumber: getNextSmokeRunNumber(selectedApp.id, runs),
      appId: selectedApp.id,
      status: "success",
      trigger: "manual",
      total: 3,
      passed: 3,
      failed: 0,
      durationSeconds: 8,
      startedBy: currentOperator,
      checkedAt: now,
      testResults: [
        "Application responds",
        "Primary route loads",
        "Critical asset resolves",
      ].map((testName, index) => ({
        id: crypto.randomUUID(),
        testName,
        testFile: `${selectedApp.id}/smoke.spec.ts`,
        status: "success",
        durationMs: 1800 + index * 450,
        errorMessage: null,
        errorStack: null,
      })),
    };

    setRuns((currentRuns) => [nextRun, ...currentRuns]);
    setSelectedRunId(nextRun.id);
  }

  return (
    <MainShell
      title="Smoke Testing"
      subtitle="Monitor the latest application state, compare recent runs, and inspect individual test diagnostics."
    >
      {/* Apps Card here */}

      {selectedApp ? (
        <section className="space-y-3" aria-labelledby="run-history-title">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div>
              <h2 id="run-history-title" className="text-lg font-medium">
                {selectedApp.name} run history
              </h2>
              <p className="text-sm text-muted-foreground">
                Select a run to inspect its test-level results.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div
                className="flex flex-wrap gap-1 rounded-lg border bg-muted/20 p-1"
                aria-label="Filter runs by status"
              >
                {filters.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={filter === value ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(value)}
                    className="capitalize"
                  >
                    {value}
                  </Button>
                ))}
              </div>
              <Button type="button" size="sm" onClick={runManualSmokeTest}>
                <PlayIcon className="size-4" />
                Run local smoke test
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            {selectedRuns.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Tests</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Checked</TableHead>
                      <TableHead>Started by</TableHead>
                      <TableHead>
                        <span className="sr-only">Open</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRuns.map((run) => (
                      <TableRow
                        key={run.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        onClick={() => openRun(run.id)}
                        onKeyDown={(event) => handleRunKeyDown(event, run.id)}
                      >
                        <TableCell className="font-medium tabular-nums">
                          #{run.runNumber}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={run.status} />
                        </TableCell>
                        <TableCell className="capitalize">
                          {run.trigger}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          <span className="text-emerald-300">
                            {run.passed} passed
                          </span>
                          <span className="text-muted-foreground"> · </span>
                          <span
                            className={
                              run.failed
                                ? "text-red-300"
                                : "text-muted-foreground"
                            }
                          >
                            {run.failed} failed
                          </span>
                        </TableCell>
                        <TableCell>
                          {formatDurationSeconds(run.durationSeconds)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatTimestamp(run.checkedAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {run.startedBy?.name ?? "System schedule"}
                        </TableCell>
                        <TableCell>
                          <ChevronRightIcon
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <TestTube2Icon />
                  </EmptyMedia>
                  <EmptyTitle>No matching runs</EmptyTitle>
                  <EmptyDescription>
                    Change the status filter or create a local smoke run.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </Card>
        </section>
      ) : null}

      <Sheet
        open={Boolean(selectedRun)}
        onOpenChange={(open) => !open && setSelectedRunId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {selectedRun ? (
            <SmokeRunDetails
              run={selectedRun}
              appName={
                apps.find((app) => app.id === selectedRun.appId)?.name ??
                selectedRun.appId
              }
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </MainShell>
  );
}

function SmokeRunDetails({
  run,
  appName,
}: {
  run: SmokeRunView;
  appName: string;
}) {
  return (
    <>
      <SheetHeader className="border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle>
            {appName} · Run #{run.runNumber}
          </SheetTitle>
          <StatusBadge status={run.status} />
        </div>
        <SheetDescription>
          {formatTimestamp(run.checkedAt)} · {run.trigger} trigger
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/15 p-4 sm:grid-cols-4">
          <Metric label="Passed" value={`${run.passed}/${run.total}`} />
          <Metric label="Failed" value={String(run.failed)} />
          <Metric
            label="Duration"
            value={formatDurationSeconds(run.durationSeconds)}
          />
          <Metric
            label="Started by"
            value={run.startedBy?.name ?? "System schedule"}
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
            {run.testResults.map((test) => (
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
                      {formatDurationMs(test.durationMs)}
                    </span>
                    <StatusBadge status={test.status} />
                  </div>
                </div>
                {test.errorMessage ? (
                  <div className="mt-3 rounded-md bg-red-500/10 p-3 text-sm text-red-200">
                    <p>{test.errorMessage}</p>
                    {test.errorStack ? (
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-red-200/75">
                        {test.errorStack}
                      </pre>
                    ) : (
                      <p className="mt-1 text-xs text-red-200/70">
                        Stack trace unavailable
                      </p>
                    )}
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
