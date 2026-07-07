export const SMOKE_TARGETS = {
  website: {
    appId: "website",
    suite: "smoke",
    testTarget: "mmdc-website",
    testPath: "tests/smoke",
    project: "chromium",
    baseUrl: "https://www.mmdc.mcl.edu.ph",
  },
} as const;

export type SmokeTargetId = keyof typeof SMOKE_TARGETS;
export type SmokeTarget = (typeof SMOKE_TARGETS)[SmokeTargetId];

export const SMOKE_TARGET_IDS = Object.keys(SMOKE_TARGETS) as [
  SmokeTargetId,
  ...SmokeTargetId[],
];

export function getSmokeTarget(appId: string): SmokeTarget | null {
  return Object.prototype.hasOwnProperty.call(SMOKE_TARGETS, appId)
    ? SMOKE_TARGETS[appId as SmokeTargetId]
    : null;
}
