import { NextResponse } from "next/server";
import { getE2eProfileById } from "@/feature/e2e/services/e2e-profile.service";
import { err, ok } from "@/utils/server-action-return";

interface RouteContext {
  params: Promise<{
    profileId: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { profileId } = await params;
  const res = await getE2eProfileById(profileId);

  if (!res) {
    return NextResponse.json(err("E2E profile not found"), { status: 404 });
  }

  return NextResponse.json(ok(res));
}
