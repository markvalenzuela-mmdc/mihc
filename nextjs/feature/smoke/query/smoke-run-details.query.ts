import {
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import {
  SmokeTestRun,
  SmokeTestRunResults,
} from "../types/smoke-test-apps.types";

export type SmokeRunDetailsData = {
  appName: string;
  details: SmokeTestRun;
  results: SmokeTestRunResults[];
};

type SmokeRunDetailsResponse = {
  appName: string;
  details: Omit<SmokeTestRun, "createdAt" | "checkedAt" | "completedAt"> & {
    createdAt: string;
    checkedAt: string;
    completedAt: string | null;
  };
  results: (Omit<
    SmokeTestRunResults,
    "createdAt" | "startedAt" | "completedAt"
  > & {
    createdAt: string;
    startedAt: string;
    completedAt: string | null;
  })[];
};

type SmokeRunDetailsApiResult =
  | {
      ok: true;
      data: SmokeRunDetailsResponse;
    }
  | {
      ok: false;
      error: string;
    };

export const SmokeRunDetailsQueryKey = ["smoke-runs", "details"] as const;

export const smokeRunDetailsOptions = (runId: string) =>
  queryOptions({
    queryKey: [...SmokeRunDetailsQueryKey, runId],
    queryFn: async (): Promise<SmokeRunDetailsData> => {
      const response = await fetch(`/api/smoke-runs/${runId}`);
      const payload = (await response.json()) as SmokeRunDetailsApiResult;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? "Failed to load smoke run details" : payload.error,
        );
      }

      return {
        appName: payload.data.appName,
        details: {
          ...payload.data.details,
          createdAt: new Date(payload.data.details.createdAt),
          checkedAt: new Date(payload.data.details.checkedAt),
          completedAt: payload.data.details.completedAt
            ? new Date(payload.data.details.completedAt)
            : null,
        },
        results: payload.data.results.map((result) => ({
          ...result,
          createdAt: new Date(result.createdAt),
          startedAt: new Date(result.startedAt),
          completedAt: result.completedAt
            ? new Date(result.completedAt)
            : null,
        })),
      };
    },
    enabled: runId.length > 0,
  });

export function useQuerySmokeRunDetails(runId: string) {
  return useQuery(smokeRunDetailsOptions(runId));
}
