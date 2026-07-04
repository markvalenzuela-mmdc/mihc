/**
 * Inngest serve endpoint for the producer app. The producer only publishes
 * events, so no functions are registered here — the smoke consumer is served by
 * the separate Playwright service (`playwright/server`).
 */
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";

export const { GET, POST, PUT } = serve({ client: inngest, functions: [] });
