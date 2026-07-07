/**
 * Runtime contract for the `smoke-test/requested` event — the wire seam between
 * the Next.js producer and this consumer.
 *
 * CANONICAL COUNTERPART: nextjs/lib/inngest/client.ts (`EventSchemas`). This zod
 * schema is the consumer's independent, runtime-validated declaration of the
 * same payload. Keep the two in sync; this is the one accepted duplication.
 *
 * The schema validates the currently supported app ids. Whether the payload's
 * suite is one this consumer acts on is a separate branch in the consumer so
 * unsupported-but-well-formed events can be logged and no-op'd.
 */
import { z } from "zod";
import { SMOKE_TARGET_IDS } from "../runner/smoke-targets";

export const SMOKE_TEST_REQUESTED = "smoke-test/requested";
export const SUPPORTED_SUITE = "smoke";

export const smokeTestRequestedSchema = z.object({
  appId: z.enum(SMOKE_TARGET_IDS),
  suite: z.string(),
  trigger: z.enum(["manual", "scheduled"]),
  correlationId: z.string().min(1),
  requestedBy: z.string().nullish(),
  requestedAt: z.string(),
});

export type SmokeTestRequested = z.infer<typeof smokeTestRequestedSchema>;
