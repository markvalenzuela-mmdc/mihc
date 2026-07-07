import type { SmokeTestRequestedAppId } from "@/lib/inngest/client";

export const SMOKE_TEST_TARGETS = {
  website: {
    appId: "website",
    appName: "Website",
    suite: "smoke",
  },
} as const satisfies Record<
  SmokeTestRequestedAppId,
  {
    appId: SmokeTestRequestedAppId;
    appName: string;
    suite: "smoke";
  }
>;

export type SmokeTestTargetId = keyof typeof SMOKE_TEST_TARGETS;

export function getSmokeTestTarget(appId: string) {
  const normalizedAppId = appId.toLowerCase();

  return (
    Object.values(SMOKE_TEST_TARGETS).find(
      (target) =>
        target.appId === normalizedAppId ||
        target.appName.toLowerCase() === normalizedAppId,
    ) ?? null
  );
}
