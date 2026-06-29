import { Hono } from "hono";
import { serve as serveNode } from "@hono/node-server";
import { serve as serveInngest } from "inngest/hono";
import { prisma, getSignedArtifactUrl } from "@mmdc/shared";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/functions/index.js";

const app = new Hono();

app.on(["GET", "POST", "PUT"], "/api/inngest", serveInngest({
  client: inngest,
  functions,
}));

app.post("/api/smoke", async (c) => {
  const run = await prisma.smokeRun.create({
    data: { status: "QUEUED" },
  });

  await inngest.send({
    id: run.id,
    name: "smoke/check.requested",
    data: { runId: run.id },
  });

  return c.json({ runId: run.id });
});

app.get("/api/smoke-runs", async (c) => {
  const runs = await prisma.smokeRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return c.json(runs);
});

app.get("/api/artifacts/:key{.+}", async (c) => {
  try {
    const key = c.req.param("key");
    const url = await getSignedArtifactUrl(key);

    return c.redirect(url);
  } catch {
    return c.json({ error: "Invalid artifact key" }, 400);
  }
});

const port = parseInt(process.env.API_PORT || "3001", 10);

console.log(`API server listening on http://localhost:${port}`);

serveNode({ fetch: app.fetch, port });