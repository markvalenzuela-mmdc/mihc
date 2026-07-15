"use client";

import { useEffect } from "react";

export function useUnsavedProfileWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function preventUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [isDirty]);
}
