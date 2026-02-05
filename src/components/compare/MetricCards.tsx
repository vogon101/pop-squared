"use client";

import type { CompareMode } from "./ModePicker";
import Tooltip from "@/components/Tooltip";

interface MetricRow {
  label: string;
  sublabel?: string;
  valueA: number | null;
  valueB: number | null;
}

interface MetricCardsProps {
  mode: CompareMode;
  rows: MetricRow[];
  loadingA: boolean;
  loadingB: boolean;
  labelA?: string;
  labelB?: string;
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDelta(a: number | null, b: number | null): { text: string; color: string } {
  if (a === null || b === null || (a === 0 && b === 0)) {
    return { text: "--", color: "text-gray-400" };
  }
  if (b === 0) return { text: "A only", color: "text-blue-600" };
  if (a === 0) return { text: "B only", color: "text-orange-600" };

  const ratio = a / b;
  if (Math.abs(ratio - 1) < 0.01) {
    return { text: "~Equal", color: "text-gray-500" };
  }
  const winner = ratio > 1 ? "A" : "B";
  const pct = Math.abs(ratio - 1) * 100;
  const color = winner === "A" ? "text-blue-600" : "text-orange-600";
  return { text: `${winner} +${pct.toFixed(0)}%`, color };
}

const LABEL_TOOLTIPS: Record<string, string> = {
  "Raw Gravity": "Sum of pop weighted by inverse distance or time. Higher = more people are nearby.",
  "Normalized": "Raw / sum of weights. A weighted average, comparable across parameter choices.",
};

export default function MetricCards({ rows, loadingA, loadingB, labelA = "A", labelB = "B" }: MetricCardsProps) {
  if (loadingA || loadingB) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-1">
        <p className="text-right text-xs font-semibold text-blue-700 truncate">{labelA}</p>
        <div className="min-w-[100px]" />
        <p className="text-left text-xs font-semibold text-orange-700 truncate">{labelB}</p>
      </div>
      {rows.map((row) => {
        const delta = formatDelta(row.valueA, row.valueB);
        return (
          <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* A value */}
            <div className="text-right">
              <p className="text-sm font-semibold text-blue-800 tabular-nums">
                {row.valueA !== null ? formatNumber(row.valueA) : "--"}
              </p>
            </div>
            {/* Label + delta */}
            <div className="text-center min-w-[100px]">
              {LABEL_TOOLTIPS[row.label] ? (
                <Tooltip text={LABEL_TOOLTIPS[row.label]}>
                  <p className="text-xs font-medium text-gray-700 cursor-help border-b border-dashed border-gray-300 inline">{row.label}</p>
                </Tooltip>
              ) : (
                <p className="text-xs font-medium text-gray-700">{row.label}</p>
              )}
              {row.sublabel && (
                <p className="text-[10px] text-gray-400">{row.sublabel}</p>
              )}
              <p className={`text-[10px] font-medium ${delta.color}`}>{delta.text}</p>
            </div>
            {/* B value */}
            <div className="text-left">
              <p className="text-sm font-semibold text-orange-800 tabular-nums">
                {row.valueB !== null ? formatNumber(row.valueB) : "--"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
