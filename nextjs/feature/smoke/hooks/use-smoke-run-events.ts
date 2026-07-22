"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { SmokeRunDetailsQueryKey } from "../query/smoke-run-details.query";
import { SmokeTestingQueryKey } from "../query/smoke-testing.query";

export function useSmokeRunEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/smoke-runs/events");

    const handleReady = () => {
      void queryClient.invalidateQueries({ queryKey: SmokeTestingQueryKey });
      void queryClient.invalidateQueries({
        queryKey: SmokeRunDetailsQueryKey,
      });
    };

    const handleSmokeChange = (event: MessageEvent<string>) => {
      if (!event.data) return;
      void queryClient.invalidateQueries({ queryKey: SmokeTestingQueryKey });
      void queryClient.invalidateQueries({
        queryKey: [...SmokeRunDetailsQueryKey, event.data],
      });
    };

    source.addEventListener("ready", handleReady);
    source.addEventListener(
      "smoke-change",
      handleSmokeChange as EventListener,
    );

    return () => {
      source.removeEventListener("ready", handleReady);
      source.removeEventListener(
        "smoke-change",
        handleSmokeChange as EventListener,
      );
      source.close();
    };
  }, [queryClient]);
}
