/**
 * Maps a Playwright JSON report from the EnrollMate E2E suite to a shape
 * bucketed by lifecycle step. Each assertion check is assigned to a lifecycle
 * step based on its name pattern (see STEP_BUCKET_MAP).
 *
 * Side-effect free so the mapping is unit-testable.
 */
import type { PlaywrightJsonReport } from "./map-results";

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
  status: "success" | "failure";
  durationSeconds: number | null;
  tests: MappedE2eStepTest[];
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

export function mapE2eResults(report: PlaywrightJsonReport | null, selectedStepIds: string[]): MappedE2eRun {
  if (!report) {
    return { status: "aborted", durationSeconds: null, steps: [] };
  }

  const specs: PwSpec[] = [];
  collectSpecs(report.suites, specs);

  // Group check annotations by resolved lifecycle step
  const stepTests = new Map<string, MappedE2eStepTest[]>();
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

        totalChecks++;

        if (!stepTests.has(stepId)) stepTests.set(stepId, []);
        stepTests.get(stepId)!.push({
          testName: check.name,
          status: check.status === "pass" ? "success" : "failure",
          durationMs: last?.duration ?? null,
          errorMessage: check.status === "fail" ? (check.message ?? null) : null,
        });
      }
    }
  }

  const durationSeconds =
    typeof report.stats?.duration === "number" ? Math.round(report.stats.duration / 1000) : null;

  const steps: MappedE2eStep[] = [];

  for (const stepId of selectedStepIds) {
    const tests = stepTests.get(stepId) ?? [];

    // A step with no tests matching the selected cycle is still created
    // (empty / no assertions recorded) so the operator sees the gap.
    const failed = tests.filter((t) => t.status === "failure").length;
    const status: "success" | "failure" = failed > 0 ? "failure" : "success";
    // No tests at all is still "success" — the step wasn't exercised.

    steps.push({
      stepId,
      status,
      durationSeconds,
      tests,
    });
  }

  // Overall run status: aborted only when no specs produced any flow-matched
  // results. Steps with zero tests (unexercised cycle phases) don't abort the run.
  const anyRan = steps.some((s) => s.tests.length > 0) || flowType !== null;
  const overallStatus: "completed" | "aborted" = anyRan ? "completed" : "aborted";

  return { status: overallStatus, durationSeconds, steps };
}
