"use client";

import { useState } from "react";
import type { TransportMode } from "@/lib/travel-time-types";
import type { TimeBand } from "@/lib/travel-time-types";
import OriginCombobox from "./OriginCombobox";

interface Origin {
  id: string;
  name: string;
  type: "city" | "airport";
  country: string;
  computed: boolean;
}

interface Results {
  totalReachable: number;
  totalPopulation: number;
  rawSum: number;
  normalized: number;
  timeBands: TimeBand[];
}

interface TravelTimeExplorerProps {
  origins: Origin[];
  selectedOrigin: string | null;
  onOriginChange: (id: string | null) => void;
  mode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
  exponent: number;
  onExponentChange: (exp: number) => void;
  maxTimeMin: number;
  onMaxTimeChange: (min: number) => void;
  colorBy: "travel-time" | "weight";
  onColorByChange: (cb: "travel-time" | "weight") => void;
  results: Results | null;
  loading: boolean;
  error: string | null;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatExp(n: number): string {
  return n === Math.round(n) ? String(n) : n.toFixed(1);
}

const DEFAULT_MAX_TIME = 120;
const UNLIMITED_MAX_TIME = 180;

function MaxTimeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [maxCap, setMaxCap] = useState(DEFAULT_MAX_TIME);
  const unlimited = maxCap === UNLIMITED_MAX_TIME;

  const toggleLimit = () => {
    if (unlimited) {
      setMaxCap(DEFAULT_MAX_TIME);
      if (value > DEFAULT_MAX_TIME) onChange(DEFAULT_MAX_TIME);
    } else {
      setMaxCap(UNLIMITED_MAX_TIME);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-gray-700">
          Max travel time: {value} min
        </label>
        <button
          onClick={toggleLimit}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {unlimited ? `Cap at ${DEFAULT_MAX_TIME} min` : "Remove limit"}
        </button>
      </div>
      <input
        type="range"
        min={15}
        max={maxCap}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>15 min</span>
        <span>{maxCap} min</span>
      </div>
    </div>
  );
}

export default function TravelTimeExplorer({
  origins,
  selectedOrigin,
  onOriginChange,
  mode,
  onModeChange,
  exponent,
  onExponentChange,
  maxTimeMin,
  onMaxTimeChange,
  colorBy,
  onColorByChange,
  results,
  loading,
  error,
}: TravelTimeExplorerProps) {
  return (
    <div className="space-y-5">
      {/* Origin Selector */}
      <OriginCombobox
        origins={origins}
        value={selectedOrigin}
        onChange={onOriginChange}
      />

      {/* Mode Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Transport Mode
        </label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["driving", "transit", "fastest"] as TransportMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {m === "driving" ? "Driving" : m === "transit" ? "Transit" : "Fastest"}
            </button>
          ))}
        </div>
      </div>

      {/* Exponent Slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Exponent: {exponent.toFixed(1)} &mdash; 1/t<sup>{formatExp(exponent)}</sup>
        </label>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={exponent}
          onChange={(e) => onExponentChange(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.1</span>
          <span>3.0</span>
        </div>
      </div>

      {/* Max Time Slider */}
      <MaxTimeSlider value={maxTimeMin} onChange={onMaxTimeChange} />

      {/* Color By Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Colour by
        </label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => onColorByChange("travel-time")}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              colorBy === "travel-time"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Travel Time
          </button>
          <button
            onClick={() => onColorByChange("weight")}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              colorBy === "weight"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            1/t<sup>n</sup> Weight
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading data...</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {results && !loading && (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Reachable within {maxTimeMin} min
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {results.totalPopulation.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">
              {formatNumber(results.totalPopulation)} people across{" "}
              {results.totalReachable.toLocaleString()} cells
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-3">
            <p className="text-xs uppercase tracking-wide text-blue-600 font-medium">
              Travel-Time Gravity (1/t<sup>{formatExp(exponent)}</sup>)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-blue-500 font-medium">Raw</p>
                <p className="text-lg font-semibold text-blue-900">
                  {results.rawSum.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-500 font-medium">Normalized</p>
                <p className="text-lg font-semibold text-blue-900">
                  {results.normalized.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Time Band Table */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Time Band Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-1.5 pr-2">Band (min)</th>
                    <th className="py-1.5 pr-2 text-right">Population</th>
                    <th className="py-1.5 pr-2 text-right">Cells</th>
                    <th className="py-1.5 text-right">
                      1/t<sup>{formatExp(exponent)}</sup>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.timeBands
                    .filter((b) => b.cellCount > 0)
                    .map((band) => (
                      <tr
                        key={band.minMin}
                        className="border-b border-gray-100 text-gray-700"
                      >
                        <td className="py-1.5 pr-2">
                          {band.minMin}&ndash;{band.maxMin}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {band.population.toLocaleString()}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {band.cellCount.toLocaleString()}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {Math.round(band.weightedContribution * 100) / 100}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!selectedOrigin && !loading && (
        <p className="text-sm text-gray-500">
          Select an origin to explore travel-time data.
        </p>
      )}
    </div>
  );
}
