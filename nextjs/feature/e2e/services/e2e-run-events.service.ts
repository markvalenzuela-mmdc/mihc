import { Client, type Notification } from "pg";
import { getDatabaseUrl } from "@/lib/drizzle/db";

export const E2E_RUN_CHANGED_CHANNEL = "e2e_run_changed";
export const E2E_EVENT_HEARTBEAT_MS = 20_000;

interface E2eEventClient {
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

type E2eInterval = ReturnType<typeof globalThis.setInterval>;

interface E2eRunEventStreamDependencies {
  createClient: () => E2eEventClient;
  setInterval: (handler: () => void, timeout: number) => E2eInterval;
  clearInterval: (interval: E2eInterval) => void;
}

const encoder = new TextEncoder();

function encodeEvent(event: string, data: string) {
  return encoder.encode(`event: ${event}\ndata:${data ? ` ${data}` : ""}\n\n`);
}

const defaultDependencies: E2eRunEventStreamDependencies = {
  createClient: () =>
    new Client({
      connectionString: getDatabaseUrl(),
    }),
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
};

export function createE2eRunEventStream(
  signal: AbortSignal,
  dependencyOverrides: Partial<E2eRunEventStreamDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  let cleanup: (() => Promise<void>) | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const client = dependencies.createClient();
      let heartbeat: E2eInterval | undefined;
      let closed = false;

      const onNotification = (notification: Notification) => {
        if (
          closed ||
          notification.channel !== E2E_RUN_CHANGED_CHANNEL ||
          !notification.payload
        ) {
          return;
        }

        controller.enqueue(encodeEvent("e2e-change", notification.payload));
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
          await client.query(`LISTEN ${E2E_RUN_CHANGED_CHANNEL}`);
          if (closed) return;

          controller.enqueue(encodeEvent("ready", ""));
          heartbeat = dependencies.setInterval(() => {
            if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }, E2E_EVENT_HEARTBEAT_MS);
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
