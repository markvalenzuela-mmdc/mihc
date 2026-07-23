import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  SmokeTestApp,
  SmokeTestRun,
  SmokeTestRunResults,
} from "@/feature/smoke/types/smoke-test-apps.types";

vi.mock("nuqs", () => ({
  useQueryStates: () => [{ app: null }, vi.fn()],
}));

vi.mock("@/components/ui/sheet", () => ({
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import SmokeRunDetails from "@/feature/smoke/components/smoke-run-details";
import { SmokeTestingAppsCard } from "@/feature/smoke/components/smoke-testing-cards";

const runningRun: SmokeTestRun = {
  id: "run-1",
  status: "running",
  createdAt: new Date("2026-07-22T08:00:00.000Z"),
  runNumber: 7,
  appId: "website",
  trigger: "manual",
  total: 0,
  passed: 0,
  failed: 0,
  durationSeconds: null,
  startedBy: null,
  checkedAt: new Date("2026-07-22T08:00:00.000Z"),
  completedAt: null,
};

const runningResult: SmokeTestRunResults = {
  id: "result-1",
  runId: runningRun.id,
  status: "running",
  testName: "Landing page",
  testFile: "smoke/landing.spec.ts",
  durationMs: null,
  errorMessage: null,
  errorStack: null,
  createdAt: new Date("2026-07-22T08:00:01.000Z"),
  startedAt: new Date("2026-07-22T08:00:01.000Z"),
  completedAt: null,
};

const queuedRun: SmokeTestRun = {
  ...runningRun,
  status: "queued",
};

describe("active Smoke state", () => {
  it("renders running details as in progress", () => {
    render(
      <SmokeRunDetails
        appName="Website"
        details={runningRun}
        results={[]}
      />,
    );

    expect(screen.getByText("In progress")).toBeVisible();
    expect(screen.getByText("running")).toBeVisible();
    expect(screen.getByText("Waiting for test results…")).toBeVisible();
    expect(screen.getByRole("status", { name: "Loading" })).toBeVisible();
  });

  it("removes the waiting state after the first result appears", () => {
    render(
      <SmokeRunDetails
        appName="Website"
        details={{ ...runningRun, total: 1 }}
        results={[runningResult]}
      />,
    );

    expect(screen.getByText("Landing page")).toBeVisible();
    expect(screen.queryByText("Waiting for test results…")).not.toBeInTheDocument();
  });

  it("renders queued details without pretending execution started", () => {
    render(
      <SmokeRunDetails
        appName="Website"
        details={queuedRun}
        results={[]}
      />,
    );

    expect(screen.getByText("Queued")).toBeVisible();
    expect(screen.getByText("Waiting for an execution slot…")).toBeVisible();
    expect(screen.queryByText("Waiting for test results…")).not.toBeInTheDocument();
  });

  it("does not show the waiting state for a terminal empty run", () => {
    render(
      <SmokeRunDetails
        appName="Website"
        details={{
          ...runningRun,
          status: "failure",
          durationSeconds: 0,
          completedAt: new Date("2026-07-22T08:00:02.000Z"),
        }}
        results={[]}
      />,
    );

    expect(screen.queryByText("Waiting for test results…")).not.toBeInTheDocument();
  });

  it("uses the active color for a running card history segment", () => {
    const app: SmokeTestApp = {
      id: "website",
      name: "Website",
      description: null,
      createdAt: new Date("2026-07-22T08:00:00.000Z"),
      updatedAt: new Date("2026-07-22T08:00:00.000Z"),
      createdBy: null,
      updatedBy: null,
      smokeRuns: [runningRun],
    };

    render(<SmokeTestingAppsCard apps={[app]} />);

    expect(screen.getByTitle("Run 7: running")).toHaveClass("bg-blue-400");
  });

  it("uses the queued color for a queued card history segment", () => {
    const app: SmokeTestApp = {
      id: "website",
      name: "Website",
      description: null,
      createdAt: new Date("2026-07-22T08:00:00.000Z"),
      updatedAt: new Date("2026-07-22T08:00:00.000Z"),
      createdBy: null,
      updatedBy: null,
      smokeRuns: [queuedRun],
    };

    render(<SmokeTestingAppsCard apps={[app]} />);

    expect(screen.getByTitle("Run 7: queued")).toHaveClass("bg-slate-400");
  });
});
