import { NextResponse } from "next/server";
import { getSmokeTestResultsByRunId } from "@/feature/smoke/services/smoke-test-results.service";
import { err, ok } from "@/utils/server-action-return";

interface RouteContext {
  params: Promise<{
    runId: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { runId } = await params;
  const res = await getSmokeTestResultsByRunId(runId);

  if (!res) {
    return NextResponse.json(err("Smoke run not found"), { status: 404 });
  }

  const { app, testResults, ...details } = res;

  return NextResponse.json(
    ok({
      appName: app.name,
      details,
      results: testResults,
    }),
  );
}
