-- CreateEnum
CREATE TYPE "SmokeStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "SmokeRun" (
    "id" TEXT NOT NULL,
    "status" "SmokeStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "result" TEXT,
    "artifactKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmokeRun_pkey" PRIMARY KEY ("id")
);
