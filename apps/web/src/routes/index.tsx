import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";

type SmokeRun = {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  result: string | null;
  artifactKey: string | null;
};

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    QUEUED: "bg-yellow-100 text-yellow-800",
    RUNNING: "bg-blue-100 text-blue-800",
    PASSED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [runs, setRuns] = useState<SmokeRun[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/smoke-runs");
      const data = await res.json();
      setRuns(data);
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 2000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  async function runSmoke() {
    setLoading(true);
    try {
      const res = await fetch("/api/smoke", { method: "POST" });
      await res.json();
      await fetchRuns();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Smoke Check</h1>
        <button
          onClick={runSmoke}
          disabled={loading}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Running..." : "Run smoke check"}
        </button>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Duration</th>
              <th className="px-4 py-3 font-medium text-gray-600">Result</th>
              <th className="px-4 py-3 font-medium text-gray-600">
                Screenshot
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No smoke runs yet. Click the button above to start one.
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {run.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">{statusBadge(run.status)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {run.durationMs != null ? `${run.durationMs}ms` : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {run.result ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {run.artifactKey ? (
                      <a
                        href={`/api/artifacts/${run.artifactKey}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}