"use client";

import { useMemo, useState } from "react";
import { PlayIcon } from "lucide-react";

import type { RunResult, SmokeApp, SmokeRun } from "@/lib/mock-testing-data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FilterValue = "all" | RunResult;

export function SmokeTestingClient({
  apps,
  initialRuns,
}: {
  apps: SmokeApp[];
  initialRuns: SmokeRun[];
}) {
  const [selectedAppId, setSelectedAppId] = useState(apps[0]?.id ?? "");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [runs, setRuns] = useState(initialRuns);

  const selectedApp = apps.find((app) => app.id === selectedAppId) ?? apps[0];
  const selectedRuns = useMemo(() => {
    return runs.filter((run) => {
      const matchesApp = run.appId === selectedApp?.id;
      const matchesFilter = filter === "all" || run.result === filter;
      return matchesApp && matchesFilter;
    });
  }, [filter, runs, selectedApp?.id]);

  function runManualSmokeTest() {
    if (!selectedApp) return;

    const nextRun: SmokeRun = {
      id: `manual-${Date.now()}`,
      appId: selectedApp.id,
      result: "success",
      trigger: "manual",
      duration: "3s",
      checkedAt: "Just now",
      detail: "Frontend-only manual run queued and marked successful.",
    };

    setRuns((currentRuns) => [nextRun, ...currentRuns]);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">Smoke Testing</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Health checks for MMDC-maintained applications, with manual smoke runs
          and recent history for maintainers.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {apps.map((app) => {
          const appRuns = runs.filter((run) => run.appId === app.id).slice(0, 5);
          const lastRun = appRuns[0];
          const isSelected = selectedAppId === app.id;

          return (
            <button
              key={app.id}
              type="button"
              onClick={() => setSelectedAppId(app.id)}
              className="text-left"
            >
              <Card
                className={
                  isSelected
                    ? "border-primary bg-card"
                    : "border-border bg-card/80 hover:border-primary/40"
                }
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{app.name}</CardTitle>
                    <Badge variant="outline">{app.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {app.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-2xl font-semibold">{app.uptime}</p>
                    <p className="text-xs text-muted-foreground">
                      Last checked {app.lastChecked}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {appRuns.map((run) => (
                      <span
                        key={run.id}
                        className={
                          run.result === "success"
                            ? "h-2 flex-1 rounded-sm bg-emerald-400"
                            : "h-2 flex-1 rounded-sm bg-red-400"
                        }
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last run: {lastRun?.result ?? "No runs yet"}
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-medium">{selectedApp?.name} history</h2>
            <p className="text-sm text-muted-foreground">
              Filter historical smoke runs or trigger a frontend-only manual run.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "success", "failure"] as FilterValue[]).map((value) => (
              <Button
                key={value}
                type="button"
                variant={filter === value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(value)}
              >
                {value}
              </Button>
            ))}
            <Button type="button" size="sm" onClick={runManualSmokeTest}>
              <PlayIcon className="size-4" />
              Run smoke test
            </Button>
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Result</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Checked</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    <Badge variant="outline" className={cn(run.result === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300")}>
                      {run.result}
                    </Badge>
                  </TableCell>
                  <TableCell>{run.trigger}</TableCell>
                  <TableCell>{run.duration}</TableCell>
                  <TableCell>{run.checkedAt}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {run.detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
