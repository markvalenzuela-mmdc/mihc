import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  createSmokeRunEventStream,
  SMOKE_EVENT_HEARTBEAT_MS,
} from "@/feature/smoke/services/smoke-run-events.service";

class FakeClient extends EventEmitter {
  connected = false;
  ended = false;
  queries: string[] = [];

  async connect() {
    this.connected = true;
  }

  async query(query: string) {
    this.queries.push(query);
    return {};
  }

  async end() {
    this.ended = true;
  }
}

const decoder = new TextDecoder();

describe("createSmokeRunEventStream", () => {
  it("subscribes before emitting ready and forwards matching notifications", async () => {
    const client = new FakeClient();
    const abort = new AbortController();
    const stream = createSmokeRunEventStream(abort.signal, {
      createClient: () => client,
    });
    const reader = stream.getReader();

    const ready = await reader.read();
    expect(client.connected).toBe(true);
    expect(client.queries).toEqual(["LISTEN smoke_run_changed"]);
    expect(decoder.decode(ready.value)).toBe("event: ready\ndata:\n\n");

    client.emit("notification", {
      channel: "smoke_run_changed",
      payload: "run-1",
      processId: 1,
    });
    const change = await reader.read();
    expect(decoder.decode(change.value)).toBe(
      "event: smoke-change\ndata: run-1\n\n",
    );

    abort.abort();
    await vi.waitFor(() => expect(client.ended).toBe(true));
  });

  it("emits heartbeat comments and releases resources on cancellation", async () => {
    const client = new FakeClient();
    let heartbeat: (() => void) | undefined;
    const clearInterval = vi.fn();
    const stream = createSmokeRunEventStream(new AbortController().signal, {
      createClient: () => client,
      setInterval: (handler, timeout) => {
        expect(timeout).toBe(SMOKE_EVENT_HEARTBEAT_MS);
        heartbeat = handler;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval,
    });
    const reader = stream.getReader();
    await reader.read();

    heartbeat?.();
    const message = await reader.read();
    expect(decoder.decode(message.value)).toBe(": heartbeat\n\n");

    await reader.cancel();
    expect(clearInterval).toHaveBeenCalledTimes(1);
    expect(client.ended).toBe(true);
  });

  it("closes the stream when the PostgreSQL listener fails", async () => {
    const client = new FakeClient();
    const stream = createSmokeRunEventStream(new AbortController().signal, {
      createClient: () => client,
    });
    const reader = stream.getReader();
    await reader.read();

    client.emit("error", new Error("listener disconnected"));
    await expect(reader.read()).resolves.toMatchObject({ done: true });
    expect(client.ended).toBe(true);
  });
});
