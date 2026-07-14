"use client";

import { useQueryState } from "nuqs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { runParamKey } from "./smoke-testing.query-state";
import { useQuerySmokeRunDetails } from "../query/smoke-run-details.query";
import SmokeRunDetails from "./smoke-run-details";
import SmokeRunDetailsSkeleton from "./smoke-run-details-sheet-skeleton";

export default function SmokeRunDetailsSheet() {
  const [selectedRunId, setSelectedRunId] = useQueryState(runParamKey);
  const runId = selectedRunId ?? "";
  const query = useQuerySmokeRunDetails(runId);

  return (
    <Sheet
      open={runId.length > 0}
      onOpenChange={(open) => {
        if (!open) setSelectedRunId(null);
      }}
    >
      <SheetContent className="w-full sm:max-w-3xl">
        <SmokeRunDetailsContent query={query} />
      </SheetContent>
    </Sheet>
  );
}

function SmokeRunDetailsContent({
  query,
}: {
  query: ReturnType<typeof useQuerySmokeRunDetails>;
}) {
  if (query.isLoading) {
    return <SmokeRunDetailsSkeleton />;
  }

  if (query.isError) {
    return (
      <div className="p-4 text-sm text-destructive">
        Could not load smoke run details.
      </div>
    );
  }

  if (query.data) {
    return (
      <SmokeRunDetails
        appName={query.data.appName}
        details={query.data.details}
        results={query.data.results}
      />
    );
  }

  return null;
}
