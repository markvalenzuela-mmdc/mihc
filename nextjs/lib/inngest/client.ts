/**
 * Inngest client (producer side). Publishes smoke-test requests to the
 * self-hosted Inngest instance and registers no functions — execution and
 * persistence live in the Playwright consumer (`playwright/server`).
 *
 * CANONICAL COUNTERPART for the payload: playwright/server/inngest/events.ts
 * (zod schema). The two declarations are the wire contract; keep them in sync.
 * This is the one accepted duplication (contract, not logic).
 */
import { Inngest } from "inngest";

export const SMOKE_TEST_REQUESTED = "smoke-test/requested";
export const E2E_TEST_REQUESTED = "e2e-test/requested";

export interface E2eTestRequestedData {
  profileId: string;
  stepIds: string[];
  requestedBy: string;
  correlationId: string;
  requestedAt: string;
}

export type SmokeTestRequestedAppId = "website";
export type SmokeTestTrigger = "manual" | "scheduled";

/** Payload v1 for `smoke-test/requested`. */
export interface SmokeTestRequestedData {
  appId: SmokeTestRequestedAppId;
  suite: "smoke";
  trigger: SmokeTestTrigger;
  correlationId: string;
  /** Operator user id for manual runs; absent for scheduled events. */
  requestedBy?: string | null;
  requestedAt: string;
}

export const inngest = new Inngest({
  id: "mihc",
  eventKey: process.env.INNGEST_EVENT_KEY,
  baseUrl: process.env.INNGEST_BASE_URL,
});
