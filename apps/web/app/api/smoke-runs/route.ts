import { NextResponse } from "next/server";
import { prisma } from "@mmdc/shared";

export async function GET() {
  const runs = await prisma.smokeRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(runs);
}