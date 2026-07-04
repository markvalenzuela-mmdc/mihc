import { queryOptions, useQuery } from "@tanstack/react-query";
import { E2eProfileWorkspaceData } from "../types/e2e-testing.types";

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

export function useQueryE2eProfileWorkspace(profileId: string) {
  return useQuery(e2eProfileWorkspaceOptions(profileId));
}
