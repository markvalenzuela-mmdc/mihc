import {
  prisma,
  uploadArtifact,
  buildSmokeArtifactKey,
} from "@mmdc/shared";
import { inngest } from "../client.js";
import { runSmokeCheck } from "../checks/smoke.js";

export const smokeCheck: any = inngest.createFunction(
  {
    id: "smoke-check",
    retries: 3,
    triggers: [{ event: "smoke/check.requested" }],
  },
  async ({ event, step }) => {
    const { runId } = event.data as { runId: string };

    await step.run("mark-run-running", async () => {
      await prisma.smokeRun.update({
        where: { id: runId },
        data: { status: "RUNNING", startedAt: new Date() },
      });
    });

    const startTime = performance.now();

    try {
      const screenshot = await runSmokeCheck();
      const artifactKey = buildSmokeArtifactKey(runId);

      await step.run("upload-screenshot", async () => {
        await uploadArtifact(artifactKey, screenshot);
      });

      const durationMs = Math.round(performance.now() - startTime);

      await step.run("mark-run-passed", async () => {
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
      });

      return { runId, status: "PASSED", artifactKey };
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      const message =
        error instanceof Error ? error.message : String(error);

      await step.run("mark-run-failed", async () => {
        await prisma.smokeRun.update({
          where: { id: runId },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            durationMs,
            result: message,
          },
        });
      });

      throw error;
    }
  },
);