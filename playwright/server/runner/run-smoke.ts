/**
 * Spawns the existing Playwright smoke suite as a child process and returns the
 * parsed built-in JSON report plus the process exit code. Kept separate from
 * mapping/persistence so browser crashes are isolated to this boundary.
 *
 * The suite is invoked via the local Playwright binary (not `pnpm exec`, which
 * runs a deps-verify step on every call) with `--reporter=json` written to a
 * temp file (`PLAYWRIGHT_JSON_OUTPUT_FILE`). The child cwd is the `playwright/`
 * package root — required so relative spec paths resolve.
 */
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir, platform } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Logger } from "../logger";
import type { PlaywrightJsonReport } from "./map-results";
import type { SmokeTarget } from "./smoke-targets";

// server/runner/run-smoke.ts -> up two dirs is the playwright/ package root.
const PACKAGE_ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
const PLAYWRIGHT_BIN = join(PACKAGE_ROOT, "node_modules", ".bin", `playwright${platform() === "win32" ? ".CMD" : ""}`);

export interface RunSmokeOptions {
  correlationId: string;
  trigger: "manual" | "scheduled";
  /** Operator identity threaded to the suite via TRIGGERED_BY (null in v1). */
  requestedBy?: string | null;
  target: SmokeTarget;
  logger: Logger;
}

export interface RunSmokeResult {
  report: PlaywrightJsonReport | null;
  exitCode: number | null;
}

export async function runSmoke(opts: RunSmokeOptions): Promise<RunSmokeResult> {
  const { correlationId, trigger, requestedBy, target, logger } = opts;
  const reportPath = join(tmpdir(), `smoke-report-${correlationId}.json`);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TEST_MODE: trigger === "manual" ? "manual" : "automated",
    TRIGGERED_BY: requestedBy ?? (trigger === "manual" ? "manual-dashboard" : "scheduler"),
    TEST_TARGET: target.testTarget,
    PLAYWRIGHT_BASE_URL: target.baseUrl,
    PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
  };

  logger.info("suite_spawn", { reportPath, appId: target.appId, testPath: target.testPath });

  const exitCode = await new Promise<number | null>((resolvePromise) => {
    const child = spawn(
      PLAYWRIGHT_BIN,
      ["test", target.testPath, `--project=${target.project}`, "--reporter=json"],
      { cwd: PACKAGE_ROOT, env, shell: platform() === "win32" },
    );

    // Surface child output through the structured logger (browser noise stays
    // out of the JSON report file).
    child.stderr.on("data", (buf: Buffer) => logger.warn("suite_stderr", { chunk: buf.toString().trim() }));
    child.on("error", (err) => {
      logger.error("suite_spawn_error", { message: err.message });
      resolvePromise(null);
    });
    child.on("close", (code) => resolvePromise(code));
  });

  let report: PlaywrightJsonReport | null = null;
  try {
    const raw = await readFile(reportPath, "utf8");
    report = JSON.parse(raw) as PlaywrightJsonReport;
  } catch (err) {
    // Missing/unparseable report => suite could not produce results; caller maps
    // a null report to a `failure` run.
    logger.error("suite_report_unreadable", {
      message: err instanceof Error ? err.message : String(err),
      exitCode,
    });
  } finally {
    await rm(reportPath, { force: true }).catch(() => {});
  }

  logger.info("suite_complete", { exitCode, hasReport: report !== null });
  return { report, exitCode };
}
