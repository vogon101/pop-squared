"use client";

import { useEffect, useState } from "react";
import { useBatchCompute } from "@/hooks/useBatchCompute";

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}m ${s}s`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    computing: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    skipped: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

export default function ComputeDashboard() {
  const { state, loadOrigins, start, pause, retryErrors } = useBatchCompute();
  const [limit, setLimit] = useState<number | "">(5);

  useEffect(() => {
    loadOrigins();
  }, [loadOrigins]);

  const pendingCount = state.origins.filter((o) => o.status !== "done").length;
  const effectiveLimit = limit === "" ? pendingCount : Math.min(limit, pendingCount);
  const remaining = state.total - state.completed - state.errors;
  const eta =
    state.avgTimeMs && remaining > 0
      ? formatDuration(state.avgTimeMs * remaining)
      : null;

  const progressPct = state.total > 0 ? (state.completed / state.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">
            {state.completed}/{state.total} complete
            {state.errors > 0 && (
              <span className="text-red-600 ml-2">({state.errors} errors)</span>
            )}
          </p>
          {eta && state.status === "running" && (
            <p className="text-xs text-gray-500">ETA: {eta}</p>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {state.avgTimeMs && (
          <p className="text-xs text-gray-400 mt-1">
            Avg: {formatDuration(state.avgTimeMs)} per origin
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {(state.status === "idle" || state.status === "paused" || state.status === "done") && (
          <>
            <button
              onClick={() => start(limit === "" ? undefined : limit)}
              disabled={pendingCount === 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.status === "idle" ? "Start" : state.status === "paused" ? "Resume" : "Restart"}
              {effectiveLimit > 0 && effectiveLimit < pendingCount
                ? ` (${effectiveLimit})`
                : ""}
            </button>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500">Limit:</label>
              <input
                type="number"
                min={1}
                max={state.total}
                value={limit}
                onChange={(e) =>
                  setLimit(e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))
                }
                placeholder="All"
                className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {limit !== "" && (
                <button
                  onClick={() => setLimit("")}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  All
                </button>
              )}
            </div>
          </>
        )}
        {state.status === "running" && (
          <button
            onClick={pause}
            className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Pause
          </button>
        )}
        {state.errors > 0 && state.status !== "running" && (
          <button
            onClick={retryErrors}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Errors
          </button>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Status:</span>
        <StatusBadge status={state.status} />
        {state.current && (
          <span className="text-blue-600">
            Computing: {state.origins.find((o) => o.id === state.current)?.name || state.current}
          </span>
        )}
      </div>

      {/* Origins Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
              <th className="px-4 py-2.5 font-medium">Origin</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Country</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Cells</th>
            </tr>
          </thead>
          <tbody>
            {state.origins.map((origin) => (
              <tr
                key={origin.id}
                className={`border-b border-gray-100 ${
                  origin.id === state.current ? "bg-blue-50" : ""
                }`}
              >
                <td className="px-4 py-2 text-gray-900 font-medium">{origin.name}</td>
                <td className="px-4 py-2 text-gray-500 capitalize">{origin.type}</td>
                <td className="px-4 py-2 text-gray-500">{origin.country}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={origin.status} />
                  {origin.error && (
                    <span className="ml-2 text-xs text-red-500" title={origin.error}>
                      {origin.error.length > 40
                        ? origin.error.slice(0, 40) + "..."
                        : origin.error}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                  {origin.cellCount?.toLocaleString() ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
