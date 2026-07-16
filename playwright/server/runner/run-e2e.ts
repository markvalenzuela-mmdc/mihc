/**
 * Spawns the EnrollMate E2E Playwright suite as a child process, passing
 * profile form data via a temp JSON file and env vars so the spec reads it
 * instead of generating fixture data. Follows the same spawn pattern as
 * run-smoke.ts.
 *
 * Returns the parsed JSON report so the caller can map and persist results.
 */
import { spawn } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, platform } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Logger } from "../logger";
import type { PlaywrightJsonReport } from "./map-results";

const PACKAGE_ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
const PLAYWRIGHT_BIN = join(PACKAGE_ROOT, "node_modules", ".bin", `playwright${platform() === "win32" ? ".CMD" : ""}`);

export interface RunE2eOptions {
  correlationId: string;
  flowType: "bachelors" | "microcredentials";
  profileFormData: Record<string, unknown>;
  logger: Logger;
}

export interface RunE2eResult {
  report: PlaywrightJsonReport | null;
  exitCode: number | null;
}

export async function runE2e(opts: RunE2eOptions): Promise<RunE2eResult> {
  const { correlationId, flowType, profileFormData, logger } = opts;

  const reportPath = join(tmpdir(), `e2e-report-${correlationId}.json`);
  const dataPath = join(tmpdir(), `e2e-data-${correlationId}.json`);

  // Write profile form data to temp file so the Playwright spec can read it
  await writeFile(dataPath, JSON.stringify(profileFormData), "utf8");

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_OPTIONS: "--import tsx",
    E2E_PROFILE_DATA_FILE: dataPath,
    FLOW_TYPE: flowType,
    PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
  };

  const testPath = "tests/e2e/enrollmate/apply-now.spec.ts";
  logger.info("e2e_suite_spawn", { reportPath, dataPath, flowType, testPath });

  const exitCode = await new Promise<number | null>((resolvePromise) => {
    const child = spawn(
      PLAYWRIGHT_BIN,
      ["test", testPath, "--project=enrollmate", "--reporter=json"],
      { cwd: PACKAGE_ROOT, env, shell: platform() === "win32" },
    );

    child.stderr.on("data", (buf: Buffer) => logger.warn("e2e_suite_stderr", { chunk: buf.toString().trim() }));
    child.on("error", (err) => {
      logger.error("e2e_suite_spawn_error", { message: err.message });
      resolvePromise(null);
    });
    child.on("close", (code) => resolvePromise(code));
  });

  // Clean up the data file regardless of outcome
  await rm(dataPath, { force: true }).catch(() => {});

  let report: PlaywrightJsonReport | null = null;
  try {
    const raw = await readFile(reportPath, "utf8");
    report = JSON.parse(raw) as PlaywrightJsonReport;
  } catch (err) {
    logger.error("e2e_suite_report_unreadable", {
      message: err instanceof Error ? err.message : String(err),
      exitCode,
    });
  } finally {
    await rm(reportPath, { force: true }).catch(() => {});
  }

  logger.info("e2e_suite_complete", { exitCode, hasReport: report !== null });
  return { report, exitCode };
}
