import { Queue } from "bullmq";
import { env } from "./env.js";
import type { SmokeJob } from "./types.js";
import { SMOKE_QUEUE } from "./types.js";

const connection = new URL(env.REDIS_URL);

let smokeQueue: Queue<SmokeJob> | null = null;

export function getSmokeQueue(): Queue<SmokeJob> {
  if (!smokeQueue) {
    smokeQueue = new Queue<SmokeJob>(SMOKE_QUEUE, {
      connection: {
        host: connection.hostname,
        port: Number(connection.port) || 6379,
      },
    });
  }
  return smokeQueue;
}