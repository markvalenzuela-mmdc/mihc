import { NextResponse } from "next/server";
import { prisma } from "@mmdc/shared";
import { inngest } from "../../../src/inngest/client";

export async function POST() {
  const run = await prisma.smokeRun.create({
    data: { status: "QUEUED" },
  });

  await inngest.send({
    id: run.id,
    name: "smoke/check.requested",
    data: { runId: run.id },
  });

  return NextResponse.json({ runId: run.id });
}