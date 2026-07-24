import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  createE2eRunEventStream,
  E2E_EVENT_HEARTBEAT_MS,
} from "@/feature/e2e/services/e2e-run-events.service";

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

describe("createE2eRunEventStream", () => {
  it("subscribes before ready and forwards matching notifications", async () => {
    const client = new FakeClient();
    const abort = new AbortController();
    const stream = createE2eRunEventStream(abort.signal, {
      createClient: () => client,
    });
    const reader = stream.getReader();

    const ready = await reader.read();
    expect(client.connected).toBe(true);
    expect(client.queries).toEqual(["LISTEN e2e_run_changed"]);
    expect(decoder.decode(ready.value)).toBe("event: ready\ndata:\n\n");

    client.emit("notification", {
      channel: "e2e_run_changed",
      payload: JSON.stringify({ profileId: "profile-1", runId: "run-1" }),
      processId: 1,
    });
    const change = await reader.read();
    expect(decoder.decode(change.value)).toBe(
      `event: e2e-change\ndata: ${JSON.stringify({
        profileId: "profile-1",
        runId: "run-1",
      })}\n\n`,
    );

    abort.abort();
    await vi.waitFor(() => expect(client.ended).toBe(true));
  });

  it("emits heartbeats and releases resources on cancellation", async () => {
    const client = new FakeClient();
    let heartbeat: (() => void) | undefined;
    const clearInterval = vi.fn();
    const stream = createE2eRunEventStream(new AbortController().signal, {
      createClient: () => client,
      setInterval: (handler, timeout) => {
        expect(timeout).toBe(E2E_EVENT_HEARTBEAT_MS);
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

  it("closes when the PostgreSQL listener fails", async () => {
    const client = new FakeClient();
    const stream = createE2eRunEventStream(new AbortController().signal, {
      createClient: () => client,
    });
    const reader = stream.getReader();
    await reader.read();

    client.emit("error", new Error("listener disconnected"));

    await expect(reader.read()).resolves.toMatchObject({ done: true });
    expect(client.ended).toBe(true);
  });
});
