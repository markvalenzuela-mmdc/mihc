"use client";

import { type KeyboardEvent, useMemo, useState, useTransition } from "react";
import { ChevronRightIcon, CircleGaugeIcon, PlayIcon, TestTube2Icon } from "lucide-react";
import { toast } from "sonner";

import { requestSmokeTest } from "@/app/smoke-testing/_actions/request-smoke-test";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatDurationMs,
  formatDurationSeconds,
  formatTimestamp,
  getSmokeAppSummary,
  getSmokeRunsForApp,
  type SmokeAppView,
  type SmokeRunStatus,
  type SmokeRunView,
} from "@/lib/mock-testing-data";
import { cn } from "@/lib/utils";

type FilterValue = "all" | SmokeRunStatus;

const filters: FilterValue[] = ["all", "success", "degraded", "failure"];

export function SmokeTestingClient({ apps, initialRuns }: { apps: SmokeAppView[]; initialRuns: SmokeRunView[] }) {
  const [selectedAppId, setSelectedAppId] = useState(apps[0]?.id ?? "");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [runs] = useState(initialRuns);
  const [isRequesting, startRequest] = useTransition();

  const selectedApp = apps.find((app) => app.id === selectedAppId) ?? apps[0] ?? null;
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;
  const selectedRuns = useMemo(() => {
    if (!selectedApp) return [];
    return getSmokeRunsForApp(selectedApp.id, runs).filter((run) => filter === "all" || run.status === filter);
  }, [filter, runs, selectedApp]);

  function selectApp(appId: string) {
    setSelectedAppId(appId);
    setSelectedRunId(null);
  }

  function openRun(runId: string) {
    setSelectedRunId(runId);
  }

  function handleRunKeyDown(event: KeyboardEvent<HTMLTableRowElement>, runId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openRun(runId);
  }

  function runManualSmokeTest() {
    if (!selectedApp) return;

    startRequest(async () => {
      const result = await requestSmokeTest();
      if (result.ok) {
        toast.success("Smoke test enqueued", {
          description: "The website smoke run was requested. Results are recorded by the test runner.",
        });
      } else {
        toast.error("Could not start smoke test", { description: result.error });
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Smoke Testing</h1>
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
            Monitor the latest application state, compare recent runs, and inspect individual test diagnostics.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit gap-1.5">
          <CircleGaugeIcon className="size-3.5" aria-hidden="true" />
          Schema-aligned fixtures
        </Badge>
      </header>

      {apps.length ? (
        <section aria-label="Monitored applications" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {apps.map((app) => {
            const summary = getSmokeAppSummary(app.id, runs);
            const latestRun = summary.latestRun;
            const isSelected = selectedAppId === app.id;

            return (
              <button key={app.id} type="button" onClick={() => selectApp(app.id)} className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className={cn("h-full transition-colors", isSelected ? "border-primary/70 bg-card" : "bg-card/70 hover:border-primary/35")}>
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{app.name}</CardTitle>
                      {latestRun ? <StatusBadge status={latestRun.status} /> : <Badge variant="outline">No runs</Badge>}
                    </div>
                    <p className="min-h-8 text-xs leading-4 text-muted-foreground">{app.description ?? "No description provided"}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xl font-semibold tabular-nums">{latestRun ? `${latestRun.passed}/${latestRun.total}` : "—"}</p>
                        <p className="text-xs text-muted-foreground">Tests passed in latest run</p>
                      </div>
                      <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="flex gap-1" aria-label="Five most recent run statuses">
                      {summary.recentRuns.length ? summary.recentRuns.map((run) => (
                        <span key={run.id} title={`Run ${run.runNumber}: ${run.status}`} className={cn("h-1.5 flex-1 rounded-full", run.status === "success" && "bg-emerald-400", run.status === "degraded" && "bg-amber-400", run.status === "failure" && "bg-red-400")} />
                      )) : <span className="h-1.5 flex-1 rounded-full bg-muted" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{latestRun ? `Checked ${formatTimestamp(latestRun.checkedAt)}` : "Waiting for the first run"}</p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </section>
      ) : (
        <Card><Empty><EmptyHeader><EmptyMedia variant="icon"><TestTube2Icon /></EmptyMedia><EmptyTitle>No applications configured</EmptyTitle><EmptyDescription>Applications will appear here when frontend fixtures or the future backend provide them.</EmptyDescription></EmptyHeader></Empty></Card>
      )}

      {selectedApp ? (
        <section className="space-y-3" aria-labelledby="run-history-title">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div>
              <h2 id="run-history-title" className="text-lg font-medium">{selectedApp.name} run history</h2>
              <p className="text-sm text-muted-foreground">Select a run to inspect its test-level results.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/20 p-1" aria-label="Filter runs by status">
                {filters.map((value) => (
                  <Button key={value} type="button" variant={filter === value ? "secondary" : "ghost"} size="sm" onClick={() => setFilter(value)} className="capitalize">{value}</Button>
                ))}
              </div>
              <Button type="button" size="sm" onClick={runManualSmokeTest} disabled={isRequesting}><PlayIcon className="size-4" />{isRequesting ? "Requesting…" : "Run smoke test"}</Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            {selectedRuns.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Run</TableHead><TableHead>Status</TableHead><TableHead>Trigger</TableHead><TableHead>Tests</TableHead><TableHead>Duration</TableHead><TableHead>Checked</TableHead><TableHead>Started by</TableHead><TableHead><span className="sr-only">Open</span></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {selectedRuns.map((run) => (
                      <TableRow key={run.id} role="button" tabIndex={0} className="cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={() => openRun(run.id)} onKeyDown={(event) => handleRunKeyDown(event, run.id)}>
                        <TableCell className="font-medium tabular-nums">#{run.runNumber}</TableCell>
                        <TableCell><StatusBadge status={run.status} /></TableCell>
                        <TableCell className="capitalize">{run.trigger}</TableCell>
                        <TableCell className="tabular-nums"><span className="text-emerald-300">{run.passed} passed</span><span className="text-muted-foreground"> · </span><span className={run.failed ? "text-red-300" : "text-muted-foreground"}>{run.failed} failed</span></TableCell>
                        <TableCell>{formatDurationSeconds(run.durationSeconds)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatTimestamp(run.checkedAt)}</TableCell>
                        <TableCell className="whitespace-nowrap">{run.startedBy?.name ?? "System schedule"}</TableCell>
                        <TableCell><ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Empty><EmptyHeader><EmptyMedia variant="icon"><TestTube2Icon /></EmptyMedia><EmptyTitle>No matching runs</EmptyTitle><EmptyDescription>Change the status filter or create a local smoke run.</EmptyDescription></EmptyHeader></Empty>
            )}
          </Card>
        </section>
      ) : null}

      <Sheet open={Boolean(selectedRun)} onOpenChange={(open) => !open && setSelectedRunId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {selectedRun ? <SmokeRunDetails run={selectedRun} appName={apps.find((app) => app.id === selectedRun.appId)?.name ?? selectedRun.appId} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SmokeRunDetails({ run, appName }: { run: SmokeRunView; appName: string }) {
  return (
    <>
      <SheetHeader className="border-b pb-4">
        <div className="flex flex-wrap items-center gap-2"><SheetTitle>{appName} · Run #{run.runNumber}</SheetTitle><StatusBadge status={run.status} /></div>
        <SheetDescription>{formatTimestamp(run.checkedAt)} · {run.trigger} trigger</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/15 p-4 sm:grid-cols-4">
          <Metric label="Passed" value={`${run.passed}/${run.total}`} />
          <Metric label="Failed" value={String(run.failed)} />
          <Metric label="Duration" value={formatDurationSeconds(run.durationSeconds)} />
          <Metric label="Started by" value={run.startedBy?.name ?? "System schedule"} />
        </dl>

        <section className="space-y-3" aria-labelledby="smoke-tests-title">
          <div><h3 id="smoke-tests-title" className="font-medium">Test results</h3><p className="text-sm text-muted-foreground">Assertions captured for this smoke run.</p></div>
          <div className="space-y-2">
            {run.testResults.map((test) => (
              <article key={test.id} className="rounded-lg border p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div><h4 className="text-sm font-medium">{test.testName}</h4><p className="mt-0.5 text-xs text-muted-foreground">{test.testFile ?? "Test file unavailable"}</p></div>
                  <div className="flex items-center gap-2"><span className="text-xs tabular-nums text-muted-foreground">{formatDurationMs(test.durationMs)}</span><StatusBadge status={test.status} /></div>
                </div>
                {test.errorMessage ? <div className="mt-3 rounded-md bg-red-500/10 p-3 text-sm text-red-200"><p>{test.errorMessage}</p>{test.errorStack ? <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-red-200/75">{test.errorStack}</pre> : <p className="mt-1 text-xs text-red-200/70">Stack trace unavailable</p>}</div> : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd></div>;
}
