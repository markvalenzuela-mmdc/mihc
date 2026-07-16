/**
 * Hono HTTP server hosting the Inngest `serve()` endpoint the self-hosted
 * Inngest instance calls to invoke functions, plus a health check. Runs as a
 * long-lived Node process — a good fit for spawning Playwright + browsers.
 */
import { serve as honoServe } from "@hono/node-server";
import { Hono } from "hono";
import { serve as inngestServe } from "inngest/hono";
import { inngest } from "./inngest/client";
import { smokeConsumer } from "./inngest/smoke-consumer";
import { e2eConsumer } from "./inngest/e2e-consumer";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

const inngestHandler = inngestServe({ client: inngest, functions: [smokeConsumer, e2eConsumer] });
app.on(["GET", "POST", "PUT"], "/api/inngest", (c) => inngestHandler(c));

const port = Number(process.env.PORT ?? 3939);

honoServe({ fetch: app.fetch, port }, (info) => {
  console.log(JSON.stringify({ event: "server_listening", port: info.port, ts: new Date().toISOString() }));
});
