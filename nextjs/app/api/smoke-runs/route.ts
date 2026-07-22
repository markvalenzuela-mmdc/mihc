import { NextResponse } from "next/server";

import { getCurrentUser } from "@/feature/auth/actions/auth.action";
import { getSmokeTestApps } from "@/feature/smoke/services/smoke-test-apps.service";
import { getPaginatedSmokeTestRuns } from "@/feature/smoke/services/smoke-test-runs.service";
import {
  SmokeTestRunStatus,
  type SmokeTestRunStatus as SmokeTestRunStatusValue,
} from "@/feature/smoke/types/smoke-test-apps.types";
import { err, ok } from "@/utils/server-action-return";

function parseInteger(value: string | null, defaultValue: number) {
  if (value === null) return defaultValue;

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : defaultValue;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(err("Unauthorized"), { status: 401 });
  }

  const url = new URL(request.url);
  const app = url.searchParams.get("app") ?? "";
  const page = Math.max(parseInteger(url.searchParams.get("page"), 1), 1);
  const limit = Math.min(
    Math.max(parseInteger(url.searchParams.get("limit"), 5), 1),
    100,
  );
  const tabValue = url.searchParams.get("tab");
  const tab = SmokeTestRunStatus.includes(
    tabValue as SmokeTestRunStatusValue,
  )
    ? (tabValue as SmokeTestRunStatusValue)
    : undefined;

  const apps = await getSmokeTestApps();
  const smokeRuns = await getPaginatedSmokeTestRuns({
    appId: app,
    limit,
    page,
    tab,
  });

  return NextResponse.json(
    ok({
      appName: apps.find((candidate) => candidate.id === app)?.name ?? null,
      apps,
      smokeRuns,
    }),
  );
}
