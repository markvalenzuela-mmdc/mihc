/**
 * Turns a failed test's Playwright annotations into a concise, human-readable
 * failure message for the dashboard — deliberately dropping stack traces and
 * `expect(...).toBeTruthy()` / `visible=... textLen=...` framework internals.
 *
 * Side-effect free and independent of the raw error text, so it is unit-testable
 * without spawning a browser. Consumed by `map-results.ts` at the mapping
 * boundary; the raw error is not persisted.
 *
 * The curated data comes from annotations our smoke helpers push (`lib/smoke.ts`):
 * a `url` annotation (the page under test) and one `check` annotation per check
 * (`{name, status, message}`). We build the message from the `url` plus the
 * *names* of failed checks — never the check `message`, which carries the
 * low-level assertion internals we intend to strip.
 */

export type PwAnnotation = { type: string; description?: string };

interface CheckAnnotation {
  name: string;
  status: "pass" | "fail";
  message?: string;
}

/** Parse `check` annotations, tolerating malformed JSON, and keep the failures. */
function failedCheckNames(annotations: PwAnnotation[]): string[] {
  const names: string[] = [];
  for (const a of annotations) {
    if (a.type !== "check" || !a.description) continue;
    try {
      const check = JSON.parse(a.description) as CheckAnnotation;
      if (check.status === "fail" && check.name) names.push(check.name);
    } catch {
      // Ignore unparseable check annotations rather than surfacing raw JSON.
    }
  }
  return names;
}

function urlFrom(annotations: PwAnnotation[]): string | undefined {
  const url = annotations.find((a) => a.type === "url")?.description?.trim();
  return url ? url : undefined;
}

/**
 * Map a check name to a human phrase, using the name only. Match most-specific
 * first so `cta:<Name>:navigates` wins over `cta:<Name>`. Unknown names pass
 * through unchanged so future checks degrade gracefully.
 */
export function describeCheck(name: string): string {
  const navigates = name.match(/^cta:(.+):navigates$/);
  if (navigates) {
    return `The "${navigates[1]}" call-to-action did not navigate to its expected destination`;
  }
  const cta = name.match(/^cta:(.+)$/);
  if (cta) {
    return `The "${cta[1]}" call-to-action was missing, hidden, disabled, or pointed to the wrong link`;
  }
  switch (name) {
    case "page-loads":
      return "Page did not return a successful response";
    case "key-content":
      return "Expected page content did not render";
    default:
      return name;
  }
}

export interface FormatFailureInput {
  /** Playwright per-attempt status (e.g. "failed", "timedOut"). */
  status?: string;
  annotations: PwAnnotation[];
  /** Raw Playwright message — accepted for future use, never interpolated. */
  rawMessage?: string;
}

/**
 * Build the human-readable failure message, or `null` when the test did not
 * fail. The message names what failed and the page URL (the "machine path"),
 * without the spec-file path (already shown in the run header) or any framework
 * internals.
 */
export function formatFailure(input: FormatFailureInput): string | null {
  if (input.status === "passed" || input.status === "skipped") return null;

  const url = urlFrom(input.annotations);
  const on = url ? ` on ${url}` : "";
  const failed = failedCheckNames(input.annotations);

  if (failed.length === 0) {
    // Timeout / crash / thrown error before any check recorded a result. Avoid
    // the raw message so no stack or `toBeTruthy` noise leaks through.
    const lead =
      input.status === "timedOut"
        ? "Test timed out before completing its checks"
        : "Test failed before any checks completed";
    return `${lead}${on}`;
  }

  const count = failed.length;
  const heading = `${count} check${count === 1 ? "" : "s"} failed${on}:`;
  const bullets = failed.map((name) => `• ${describeCheck(name)}`);
  return [heading, ...bullets].join("\n");
}
