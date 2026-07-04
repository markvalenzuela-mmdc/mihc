/**
 * Runtime contract for the `smoke-test/requested` event — the wire seam between
 * the Next.js producer and this consumer.
 *
 * CANONICAL COUNTERPART: nextjs/lib/inngest/client.ts (`EventSchemas`). This zod
 * schema is the consumer's independent, runtime-validated declaration of the
 * same payload. Keep the two in sync; this is the one accepted duplication.
 *
 * The schema validates *shape* only. Whether the payload is one this consumer
 * acts on (appId === "website", suite === "smoke") is a separate branch in the
 * consumer so unsupported-but-well-formed events can be logged and no-op'd.
 */
import { z } from "zod";

export const SMOKE_TEST_REQUESTED = "smoke-test/requested";
export const SUPPORTED_APP_ID = "website";
export const SUPPORTED_SUITE = "smoke";

export const smokeTestRequestedSchema = z.object({
  appId: z.string(),
  suite: z.string(),
  trigger: z.enum(["manual", "scheduled"]),
  correlationId: z.string().min(1),
  requestedBy: z.string().nullish(),
  requestedAt: z.string(),
});

export type SmokeTestRequested = z.infer<typeof smokeTestRequestedSchema>;
