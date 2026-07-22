import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import type { Paginated } from "@/lib/drizzle/pagination";
import type {
  SmokeTestApp,
  SmokeTestRun,
} from "../types/smoke-test-apps.types";

export type SmokeTestingQueryData = {
  appName: string | null;
  apps: SmokeTestApp[];
  smokeRuns: Paginated<SmokeTestRun>;
};

type SmokeTestRunApiData = Omit<
  SmokeTestRun,
  "createdAt" | "checkedAt" | "completedAt"
> & {
  createdAt: string;
  checkedAt: string;
  completedAt: string | null;
};

type SmokeTestAppApiData = Omit<
  SmokeTestApp,
  "createdAt" | "updatedAt" | "smokeRuns"
> & {
  createdAt: string;
  updatedAt: string;
  smokeRuns: SmokeTestRunApiData[];
};

type SmokeTestingApiData = {
  appName: string | null;
  apps: SmokeTestAppApiData[];
  smokeRuns: Paginated<SmokeTestRunApiData>;
};

type SmokeTestingApiResult =
  | {
      ok: true;
      data: SmokeTestingApiData;
    }
  | {
      ok: false;
      error: string;
    };

export const SmokeTestingQueryKey = ["smoke-runs", "page"] as const;

function reviveSmokeTestRun(run: SmokeTestRunApiData): SmokeTestRun {
  return {
    ...run,
    createdAt: new Date(run.createdAt),
    checkedAt: new Date(run.checkedAt),
    completedAt: run.completedAt ? new Date(run.completedAt) : null,
  };
}

function reviveSmokeTestApp(app: SmokeTestAppApiData): SmokeTestApp {
  return {
    ...app,
    createdAt: new Date(app.createdAt),
    updatedAt: new Date(app.updatedAt),
    smokeRuns: app.smokeRuns.map(reviveSmokeTestRun),
  };
}

export const smokeTestingOptions = (searchParams: string) =>
  queryOptions({
    queryKey: [...SmokeTestingQueryKey, searchParams],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SmokeTestingQueryData> => {
      const response = await fetch(`/api/smoke-runs?${searchParams}`);
      const payload = (await response.json()) as SmokeTestingApiResult;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? "Failed to load smoke testing data" : payload.error,
        );
      }

      return {
        appName: payload.data.appName,
        apps: payload.data.apps.map(reviveSmokeTestApp),
        smokeRuns: {
          ...payload.data.smokeRuns,
          data: payload.data.smokeRuns.data.map(reviveSmokeTestRun),
        },
      };
    },
  });

export function useQuerySmokeTesting(searchParams: string) {
  return useQuery(smokeTestingOptions(searchParams));
}
