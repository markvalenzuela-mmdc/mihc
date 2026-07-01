import { StatusBadge } from "@/components/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { apps } from "@/lib/drizzle/schema";
import { getSmokeAppSummary, formatTimestamp } from "@/lib/mock-testing-data";
import { cn } from "@/lib/utils";
import { TestTube2Icon, Badge, ChevronRightIcon } from "lucide-react";

function SmokeTestingAppsCardQuery() {
    const { data: apps } = useSuspenseQuery({
        
    })
}

export function SmokeTestingAppsCard() {
    

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
        const summary = getSmokeAppSummary(app.id, runs);
        const latestRun = summary.latestRun;
        const isSelected = selectedAppId === app.id;

        return (
          <button
            key={app.id}
            type="button"
            onClick={() => selectApp(app.id)}
            className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card
              className={cn(
                "h-full transition-colors cursor-pointer",
                isSelected
                  ? "border-primary/70 bg-card-foreground/10"
                  : "bg-card/70 hover:border-primary/35",
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
                  className="flex gap-1"
                  aria-label="Five most recent run statuses"
                >
                  {summary.recentRuns.length ? (
                    summary.recentRuns.map((run) => (
                      <span
                        key={run.id}
                        title={`Run ${run.runNumber}: ${run.status}`}
                        className={cn(
                          "h-1.5 flex-1 rounded-full",
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
                    ? `Checked ${formatTimestamp(latestRun.checkedAt)}`
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
