import {
  queryOptions,
  useQuery,
  useSuspenseQuery,
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
  details: Omit<SmokeTestRun, "createdAt" | "checkedAt"> & {
    createdAt: string;
    checkedAt: string;
  };
  results: (Omit<SmokeTestRunResults, "createdAt"> & {
    createdAt: string;
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
        },
        results: payload.data.results.map((result) => ({
          ...result,
          createdAt: new Date(result.createdAt),
        })),
      };
    },
    enabled: runId.length > 0,
  });

export function useQuerySmokeRunDetails(runId: string) {
  return useQuery(smokeRunDetailsOptions(runId));
}
