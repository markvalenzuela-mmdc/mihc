import { Client, type Notification } from "pg";
import { getDatabaseUrl } from "@/lib/drizzle/db";

export const SMOKE_RUN_CHANGED_CHANNEL = "smoke_run_changed";
export const SMOKE_EVENT_HEARTBEAT_MS = 20_000;

interface SmokeEventClient {
  connect(): Promise<unknown>;
  query(query: string): Promise<unknown>;
  on(
    event: "notification",
    listener: (notification: Notification) => void,
  ): this;
  on(event: "error", listener: (error: Error) => void): this;
  off(
    event: "notification",
    listener: (notification: Notification) => void,
  ): this;
  off(event: "error", listener: (error: Error) => void): this;
  end(): Promise<void>;
}

type SmokeInterval = ReturnType<typeof globalThis.setInterval>;

interface SmokeRunEventStreamDependencies {
  createClient: () => SmokeEventClient;
  setInterval: (handler: () => void, timeout: number) => SmokeInterval;
  clearInterval: (interval: SmokeInterval) => void;
}

const encoder = new TextEncoder();

function encodeEvent(event: string, data: string) {
  return encoder.encode(`event: ${event}\ndata:${data ? ` ${data}` : ""}\n\n`);
}

const defaultDependencies: SmokeRunEventStreamDependencies = {
  createClient: () =>
    new Client({
      connectionString: getDatabaseUrl(),
    }),
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
};

export function createSmokeRunEventStream(
  signal: AbortSignal,
  dependencyOverrides: Partial<SmokeRunEventStreamDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  let cleanup: (() => Promise<void>) | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const client = dependencies.createClient();
      let heartbeat: SmokeInterval | undefined;
      let closed = false;

      const onNotification = (notification: Notification) => {
        if (
          closed ||
          notification.channel !== SMOKE_RUN_CHANGED_CHANNEL ||
          !notification.payload
        ) {
          return;
        }

        controller.enqueue(
          encodeEvent("smoke-change", notification.payload),
        );
      };

      const close = async () => {
        if (closed) return;
        closed = true;
        signal.removeEventListener("abort", onAbort);
        client.off("notification", onNotification);
        client.off("error", onError);
        if (heartbeat !== undefined) {
          dependencies.clearInterval(heartbeat);
        }
        try {
          controller.close();
        } catch {
          // The consumer may already have canceled the stream.
        }
        await client.end().catch(() => undefined);
      };

      const onAbort = () => void close();
      const onError = () => void close();
      cleanup = close;

      client.on("notification", onNotification);
      client.on("error", onError);
      signal.addEventListener("abort", onAbort, { once: true });

      if (signal.aborted) {
        void close();
        return;
      }

      void (async () => {
        try {
          await client.connect();
          await client.query(`LISTEN ${SMOKE_RUN_CHANGED_CHANNEL}`);
          if (closed) return;

          controller.enqueue(encodeEvent("ready", ""));
          heartbeat = dependencies.setInterval(() => {
            if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }, SMOKE_EVENT_HEARTBEAT_MS);
        } catch {
          await close();
        }
      })();
    },
    async cancel() {
      await cleanup?.();
    },
  });
}
