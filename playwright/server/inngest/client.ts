/**
 * Inngest client for the consumer. Shares the app id ("mihc") with the producer
 * so both sides address the same self-hosted Inngest instance.
 *
 * Keys and base URL come from env (INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY,
 * INNGEST_BASE_URL). The SDK also auto-reads these from process.env; they are
 * passed explicitly here for self-documentation of the self-hosted setup.
 */
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "mihc",
  eventKey: process.env.INNGEST_EVENT_KEY,
  baseUrl: process.env.INNGEST_BASE_URL,
});
