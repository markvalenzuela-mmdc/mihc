import { Worker } from "bullmq";
import { env, prisma, uploadArtifact, SMOKE_QUEUE } from "@mmdc/shared";
import type { SmokeJob } from "@mmdc/shared";
import { runSmokeCheck } from "./checks/smoke.js";

const connection = new URL(env.REDIS_URL);

const worker = new Worker<SmokeJob>(
  SMOKE_QUEUE,
  async (job) => {
    const { runId } = job.data;

    console.log(`[smoke] Starting run ${runId}`);

    // Set RUNNING
    await prisma.smokeRun.update({
      where: { id: runId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    const startTime = performance.now();

    try {
      const screenshot = await runSmokeCheck();

      const artifactKey = `smoke/${runId}.png`;
      await uploadArtifact(artifactKey, screenshot);

      const durationMs = Math.round(performance.now() - startTime);

      await prisma.smokeRun.update({
        where: { id: runId },
        data: {
          status: "PASSED",
          finishedAt: new Date(),
          durationMs,
          result: "ok",
          artifactKey,
        },
      });

      console.log(
        `[smoke] Run ${runId} PASSED in ${durationMs}ms`,
      );
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      const message =
        error instanceof Error ? error.message : String(error);

      await prisma.smokeRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          durationMs,
          result: message,
        },
      });

      console.error(`[smoke] Run ${runId} FAILED: ${message}`);
    }
  },
  {
    connection: {
      host: connection.hostname,
      port: Number(connection.port) || 6379,
    },
  },
);

console.log(`Runner listening on queue "${SMOKE_QUEUE}"`);

// Graceful shutdown
process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});