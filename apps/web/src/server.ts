import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { prisma, getSmokeQueue, getSignedArtifactUrl } from "@mmdc/shared";

const app = new Hono();

// POST /api/smoke - create a SmokeRun and enqueue a smoke job
app.post("/api/smoke", async (c) => {
  const run = await prisma.smokeRun.create({
    data: { status: "QUEUED" },
  });

  const queue = getSmokeQueue();
  await queue.add("smoke-check", { kind: "smoke", runId: run.id });

  return c.json({ runId: run.id });
});

// GET /api/smoke-runs - latest 20 smoke runs
app.get("/api/smoke-runs", async (c) => {
  const runs = await prisma.smokeRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return c.json(runs);
});

// GET /api/artifacts/:key{.+} - redirect to signed MinIO URL
app.get("/api/artifacts/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const url = await getSignedArtifactUrl(key);
  return c.redirect(url);
});

const port = parseInt(process.env.API_PORT || "3001", 10);
console.log(`API server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });