import { NextResponse } from "next/server";

import { getE2eRunById } from "@/feature/e2e/services/e2e-profile.service";
import { err, ok } from "@/utils/server-action-return";

interface RouteContext {
  params: Promise<{
    profileId: string;
    runId: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { profileId, runId } = await params;
  const res = await getE2eRunById({ profileId, runId });

  if (!res) {
    return NextResponse.json(err("E2E run not found"), { status: 404 });
  }

  return NextResponse.json(ok(res));
}
