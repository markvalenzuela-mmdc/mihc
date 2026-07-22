"use client";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { SmokeTestApp } from "@/feature/smoke/types/smoke-test-apps.types";
import { cn } from "@/lib/utils";
import { format } from "date-fns/format";
import { TestTube2Icon, ChevronRightIcon } from "lucide-react";
import { useQueryStates } from "nuqs";
import {
  appParamKey,
  appSearchParams,
} from "./smoke-testing.query-state";
import { useTransition } from "react";

export function SmokeTestingAppsCard({ apps }: { apps: SmokeTestApp[] }) {
  const [, startTransition] = useTransition();
  const [selectedApp, setSelectedApp] = useQueryStates(appSearchParams, {
    shallow: false,
    startTransition,
  });
  
  const handleSelectApp = (appId: string) => {
    setSelectedApp({ [appParamKey]: appId });
  };

  if (apps.length === 0) {
    return (
      <Card>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TestTube2Icon />
            </EmptyMedia>
            <EmptyTitle>No applications configured</EmptyTitle>
            <EmptyDescription>
              Applications will appear here when frontend fixtures or the future
              backend provide them.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Card>
    );
  }

  return (
    <section
      aria-label="Monitored applications"
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
    >
      {apps.map((app) => {
        const latestRun = app.smokeRuns[0];
        const isSelected = selectedApp[appParamKey] === app.id;

        return (
          <button
            key={app.id}
            type="button"
            onClick={() => handleSelectApp(app.id)}
            className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card
              className={cn(
                "h-full transition-colors cursor-pointer",
                isSelected
                  ? "border-primary/70 bg-card-foreground/10"
                  : "bg-card/70 hover:bg-card-foreground/15",
              )}
            >
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{app.name}</CardTitle>
                  {latestRun ? (
                    <StatusBadge status={latestRun.status} />
                  ) : (
                    <Badge variant="outline">No runs</Badge>
                  )}
                </div>
                <p className="min-h-8 text-xs leading-4 text-muted-foreground">
                  {app.description ?? "No description provided"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold tabular-nums">
                      {latestRun
                        ? `${latestRun.passed}/${latestRun.total}`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tests passed in latest run
                    </p>
                  </div>
                  <ChevronRightIcon
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <div
                  className="flex flex-row-reverse gap-1"
                  aria-label="Five most recent run statuses"
                >
                  {app.smokeRuns.length ? (
                    app.smokeRuns.map((run) => (
                      <span
                        key={run.id}
                        title={`Run ${run.runNumber}: ${run.status}`}
                        className={cn(
                          "h-1.5 flex-1 rounded-full",
                          run.status === "running" && "bg-blue-400",
                          run.status === "success" && "bg-emerald-400",
                          run.status === "degraded" && "bg-amber-400",
                          run.status === "failure" && "bg-red-400",
                        )}
                      />
                    ))
                  ) : (
                    <span className="h-1.5 flex-1 rounded-full bg-muted" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestRun
                    ? `Checked ${format(latestRun.checkedAt, "MMM d, yyyy h:mm a")}`
                    : "Waiting for the first run"}
                </p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </section>
  );
}
