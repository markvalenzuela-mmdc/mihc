/**
 * Structured logger that stamps `correlationId` on every line, so a single
 * smoke-test request can be traced end to end (receipt → spawn → parse →
 * persist) through the consumer. Emits one JSON object per line to stdout.
 */
export interface Logger {
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
}

type Level = "info" | "warn" | "error";

export function createLogger(correlationId: string): Logger {
  const emit = (level: Level, event: string, data?: Record<string, unknown>) => {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      correlationId,
      ...data,
    });
    if (level === "error") console.error(line);
    else console.log(line);
  };

  return {
    info: (event, data) => emit("info", event, data),
    warn: (event, data) => emit("warn", event, data),
    error: (event, data) => emit("error", event, data),
  };
}
