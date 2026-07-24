"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  E2eProfileRunsQueryKey,
  E2eProfileWorkspaceQueryKey,
  E2eRunDetailsQueryKey,
} from "../query/e2e-profile-workspace.query";

interface E2eRunChangedPayload {
  profileId: string;
  runId: string;
}

function parseE2eRunChangedPayload(data: string) {
  try {
    const payload = JSON.parse(data) as Partial<E2eRunChangedPayload>;
    return typeof payload.profileId === "string" &&
      payload.profileId.length > 0 &&
      typeof payload.runId === "string" &&
      payload.runId.length > 0
      ? (payload as E2eRunChangedPayload)
      : null;
  } catch {
    return null;
  }
}

export function useE2eRunEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/e2e-runs/events");

    const handleReady = () => {
      void queryClient.invalidateQueries({
        queryKey: E2eProfileWorkspaceQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: E2eProfileRunsQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: E2eRunDetailsQueryKey,
      });
    };

    const handleE2eChange = (event: MessageEvent<string>) => {
      const payload = parseE2eRunChangedPayload(event.data);
      if (!payload) return;

      void queryClient.invalidateQueries({
        queryKey: [...E2eProfileWorkspaceQueryKey, payload.profileId],
      });
      void queryClient.invalidateQueries({
        queryKey: [...E2eProfileRunsQueryKey, payload.profileId],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          ...E2eRunDetailsQueryKey,
          payload.profileId,
          payload.runId,
        ],
      });
    };

    source.addEventListener("ready", handleReady);
    source.addEventListener("e2e-change", handleE2eChange as EventListener);

    return () => {
      source.removeEventListener("ready", handleReady);
      source.removeEventListener(
        "e2e-change",
        handleE2eChange as EventListener,
      );
      source.close();
    };
  }, [queryClient]);
}
