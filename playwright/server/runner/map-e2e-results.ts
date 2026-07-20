/**
 * Maps a Playwright JSON report from the EnrollMate E2E suite to a shape
 * bucketed by lifecycle step. Each assertion check is assigned to a lifecycle
 * step based on its name pattern (see STEP_BUCKET_MAP).
 *
 * Side-effect free so the mapping is unit-testable.
 */
import type { PlaywrightJsonReport } from "./map-results";
import { formatE2eCheckError } from "./format-failure";

/**
 * Maps a check-name substring to the lifecycle step ID it belongs to.
 * Checks that don't match any pattern fall to FALLBACK_STEP_ID.
 */
const STEP_BUCKET_MAP: Record<string, string> = {
  "page-loads": "new",
  ": filled": "validated",
  ": advanced": "validated",
  submit: "verification",
  "submission-confirmed": "enrollment_confirmation",
};

const FALLBACK_STEP_ID = "validated";

export interface MappedE2eStepTest {
  testName: string;
  status: "success" | "failure" | "skipped";
  durationMs: number | null;
  errorMessage: string | null;
}

export interface MappedE2eStep {
  stepId: string;
  status: "success" | "failure" | "untested";
  durationSeconds: number | null;
  tests: MappedE2eStepTest[];
  note?: string | null;
}

export interface MappedE2eRun {
  status: "completed" | "aborted";
  durationSeconds: number | null;
  steps: MappedE2eStep[];
}

interface PwAnnotation {
  type?: string;
  description?: string;
}

interface PwError {
  message?: string;
}

interface PwTestResult {
  status?: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  duration?: number;
  error?: PwError;
  errors?: PwError[];
  annotations?: PwAnnotation[];
}

interface PwTest {
  results?: PwTestResult[];
  annotations?: PwAnnotation[];
}

interface PwSpec {
  title: string;
  tests?: PwTest[];
}

interface PwSuite {
  title?: string;
  specs?: PwSpec[];
  suites?: PwSuite[];
}

interface CheckAnnotation {
  name: string;
  status: "pass" | "fail";
  message?: string;
}

/** Safely parse a check annotation from the Playwright JSON report. */
function parseCheckAnnotation(annotation: PwAnnotation): CheckAnnotation | null {
  if (annotation.type !== "check") return null;
  try {
    return JSON.parse(annotation.description ?? "{}") as CheckAnnotation;
  } catch {
    return null;
  }
}

/** Extract the flow type annotation from test annotations. */
function extractFlowType(annotations: PwAnnotation[] | undefined): string | null {
  if (!annotations) return null;
  for (const a of annotations) {
    if (a.type === "testId" && typeof a.description === "string") {
      const match = a.description.match(/enrollmate-apply-now-(.+)/);
      if (match) return match[1];
    }
  }
  return null;
}

/**
 * Resolve which lifecycle step a check belongs to.
 * Tries the pattern map first; falls back to FALLBACK_STEP_ID.
 */
function resolveStepId(checkName: string): string {
  for (const [pattern, stepId] of Object.entries(STEP_BUCKET_MAP)) {
    if (checkName.includes(pattern)) return stepId;
  }
  return FALLBACK_STEP_ID;
}

function collectSpecs(suites: PwSuite[] | undefined, out: PwSpec[]): void {
  if (!suites) return;
  for (const suite of suites) {
    if (suite.specs) out.push(...suite.specs);
    if (suite.suites) collectSpecs(suite.suites, out);
  }
}

export function mapE2eResults(
  report: PlaywrightJsonReport | null,
  exitCode: number | null,
  selectedStepIds: string[],
): MappedE2eRun {
  if (!report) {
    return { status: "aborted", durationSeconds: null, steps: [] };
  }

  const specs: PwSpec[] = [];
  collectSpecs(report.suites, specs);

  const pwErrors = (report.errors ?? [])
    .filter((e) => typeof e.message === "string" && e.message.length > 0)
    .map((e) => e.message as string);

  // Group check annotations by resolved lifecycle step
  const stepTests = new Map<string, MappedE2eStepTest[]>();

  const stepPwDurations = new Map<string, number[]>();
  let flowType: string | null = null;
  let totalChecks = 0;

  const fallbackStepId = selectedStepIds[selectedStepIds.length - 1];

  for (const spec of specs) {
    for (const test of spec.tests ?? []) {
      const attempts = test.results ?? [];
      const last = attempts[attempts.length - 1];
      const annotations = test.annotations ?? last?.annotations ?? [];

      // Determine flow type from both levels of annotations
      if (!flowType) {
        const allFlowAnnotations = [...(test.annotations ?? []), ...(last?.annotations ?? [])];
        flowType = extractFlowType(allFlowAnnotations);
      }

      let testStepId: string | null = null;

      // Process check annotations
      for (const annotation of annotations) {
        const check = parseCheckAnnotation(annotation);
        if (!check) continue;

        let stepId = resolveStepId(check.name);
        // If the resolved step is not in the selected set, fall through to
        // the last selected step so no assertion is silently dropped.
        if (!selectedStepIds.includes(stepId)) {
          stepId = fallbackStepId;
        }

        if (testStepId === null) testStepId = stepId;

        totalChecks++;

        if (!stepTests.has(stepId)) stepTests.set(stepId, []);
        stepTests.get(stepId)!.push({
          testName: check.name,
          status: check.status === "pass" ? "success" : "failure",
          durationMs: last?.duration ?? null,
          errorMessage: check.status === "fail" ? formatE2eCheckError(check.name, check.message) : null,
        });
      }

      if (testStepId !== null && last?.duration != null) {
        if (!stepPwDurations.has(testStepId)) stepPwDurations.set(testStepId, []);
        stepPwDurations.get(testStepId)!.push(last.duration);
      }
    }
  }

  const steps: MappedE2eStep[] = [];

  for (const stepId of selectedStepIds) {
    const tests = stepTests.get(stepId) ?? [];

    // A step with no tests matching the selected cycle is still created (so
    // the operator sees the gap) but its status is "untested" — not falsely
    
    const failed = tests.filter((t) => t.status === "failure").length;
    const status: "success" | "failure" | "untested" =
      tests.length === 0 ? "untested" : failed > 0 ? "failure" : "success";

    const pwDurations = stepPwDurations.get(stepId) ?? [];
    const stepDurationMs = pwDurations.reduce((sum, d) => sum + d, 0);
    const durationSeconds = stepDurationMs > 0 ? Math.round(stepDurationMs / 1000) : null;

    steps.push({
      stepId,
      status,
      durationSeconds,
      tests,
    });
  }

  // Overall run status:
  //   completed — at least one assertion was recorded (even if it failed).
  //   aborted — zero assertions were recorded, meaning the suite either
  //   crashed before the first assertCheck (browser crash, malformed profile,
  //   timeout on page.goto) or the Playwright report was null/empty.
  //
  // exitCode is intentionally ignored here — a zero exit with zero checks is
  // still an aborted run (nothing was tested). A non-zero exit with some
  // checks is a completed run (some tests ran before the crash).
  const overallStatus: "completed" | "aborted" =
    totalChecks === 0 ? "aborted" : "completed";

  if (overallStatus === "aborted" && pwErrors.length > 0 && steps.length > 0) {
    steps[0].note = pwErrors.join("\n");
  }

  const runDurationSeconds = steps.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

  return { status: overallStatus, durationSeconds: runDurationSeconds > 0 ? runDurationSeconds : null, steps };
}
