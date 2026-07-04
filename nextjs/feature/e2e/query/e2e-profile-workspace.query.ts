import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { Paginated } from "@/lib/drizzle/pagination";
import {
  E2eRunHistoryItem,
  E2eProfileWorkspaceData,
  E2eSelectedRun,
} from "../types/e2e-testing.types";

type E2eProfileWorkspaceApiResult =
  | {
      ok: true;
      data: E2eProfileWorkspaceData;
    }
  | {
      ok: false;
      error: string;
    };

export const E2eProfileWorkspaceQueryKey = [
  "e2e-profiles",
  "workspace",
] as const;

export const E2eProfileRunsQueryKey = ["e2e-profiles", "run-history"] as const;

export const E2eRunDetailsQueryKey = ["e2e-profiles", "runs"] as const;

export const e2eProfileWorkspaceOptions = (profileId: string) =>
  queryOptions({
    queryKey: [...E2eProfileWorkspaceQueryKey, profileId],
    queryFn: async (): Promise<E2eProfileWorkspaceData> => {
      const response = await fetch(`/api/e2e-profiles/${profileId}`);
      const payload = (await response.json()) as E2eProfileWorkspaceApiResult;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? "Failed to load e2e profile workspace" : payload.error,
        );
      }

      return payload.data;
    },
    enabled: profileId.length > 0,
  });

export const e2eRunDetailsOptions = (profileId: string, runId: string) =>
  queryOptions({
    queryKey: [...E2eRunDetailsQueryKey, profileId, runId],
    queryFn: async (): Promise<E2eSelectedRun> => {
      const response = await fetch(
        `/api/e2e-profiles/${profileId}/runs/${runId}`,
      );
      const payload = (await response.json()) as
        | {
            ok: true;
            data: E2eSelectedRun;
          }
        | {
            ok: false;
            error: string;
          };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? "Failed to load e2e run details" : payload.error,
        );
      }

      return payload.data;
    },
    enabled: profileId.length > 0 && runId.length > 0,
  });

export const e2eProfileRunsOptions = ({
  profileId,
  page,
  limit,
}: {
  profileId: string;
  page: number;
  limit: number;
}) =>
  queryOptions({
    queryKey: [...E2eProfileRunsQueryKey, profileId, page, limit],
    queryFn: async (): Promise<Paginated<E2eRunHistoryItem>> => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const response = await fetch(
        `/api/e2e-profiles/${profileId}/runs?${searchParams.toString()}`,
      );
      const payload = (await response.json()) as
        | {
            ok: true;
            data: Paginated<E2eRunHistoryItem>;
          }
        | {
            ok: false;
            error: string;
          };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? "Failed to load e2e run history" : payload.error,
        );
      }

      return payload.data;
    },
    enabled: profileId.length > 0,
    placeholderData: keepPreviousData,
  });

export function useQueryE2eProfileWorkspace(profileId: string) {
  return useQuery(e2eProfileWorkspaceOptions(profileId));
}

export function useQueryE2eRunDetails(profileId: string, runId: string) {
  return useQuery(e2eRunDetailsOptions(profileId, runId));
}

export function useQueryE2eProfileRuns({
  profileId,
  page,
  limit,
}: {
  profileId: string;
  page: number;
  limit: number;
}) {
  return useQuery(e2eProfileRunsOptions({ profileId, page, limit }));
}
