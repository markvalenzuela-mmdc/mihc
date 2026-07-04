import { NextResponse } from "next/server";

import { getPaginatedE2eRunsForProfile } from "@/feature/e2e/services/e2e-profile.service";
import { ok } from "@/utils/server-action-return";

interface RouteContext {
  params: Promise<{
    profileId: string;
  }>;
}

function parsePositiveInteger(value: string | null, defaultValue: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { profileId } = await params;
  const url = new URL(request.url);
  const page = parsePositiveInteger(url.searchParams.get("page"), 1);
  const limit = Math.min(
    Math.max(parsePositiveInteger(url.searchParams.get("limit"), 5), 5),
    100,
  );

  const runs = await getPaginatedE2eRunsForProfile({
    profileId,
    page,
    limit,
  });

  return NextResponse.json(ok(runs));
}
