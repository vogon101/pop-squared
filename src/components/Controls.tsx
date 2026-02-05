"use client";

import { useState } from "react";
import type { ColorBy } from "@/lib/circle-geojson";
import Tooltip from "./Tooltip";

const DEFAULT_MAX = 100;
const UNLIMITED_MAX = 500;

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3",
  "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077",
  "8": "\u2078", "9": "\u2079", ".": "\u02D9",
};

function superscript(n: number): string {
  const s = n === Math.round(n) ? String(n) : n.toFixed(1);
  return s.split("").map((c) => SUPERSCRIPT_DIGITS[c] ?? c).join("");
}

interface ControlsProps {
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  exponent: number;
  onExponentChange: (exponent: number) => void;
  colorBy: ColorBy;
  onColorByChange: (colorBy: ColorBy) => void;
  /** When true, only render the colour-by toggle */
  colorByOnly?: boolean;
}

export default function Controls({
  radiusKm,
  onRadiusChange,
  exponent,
  onExponentChange,
  colorBy,
  onColorByChange,
  colorByOnly,
}: ControlsProps) {
  const [maxKm, setMaxKm] = useState(DEFAULT_MAX);
  const unlimited = maxKm === UNLIMITED_MAX;

  const toggleLimit = () => {
    if (unlimited) {
      setMaxKm(DEFAULT_MAX);
      if (radiusKm > DEFAULT_MAX) onRadiusChange(DEFAULT_MAX);
    } else {
      setMaxKm(UNLIMITED_MAX);
    }
  };

  const colorByToggle = (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Colour by
      </label>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {([
          { value: "population" as const, label: "Population" },
          { value: "density" as const, label: "Density" },
          { value: "inverse-square" as const, label: `1/r${superscript(exponent)}` },
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => onColorByChange(opt.value)}
            className={`flex-1 px-2 py-2 text-sm font-medium transition-colors ${
              colorBy === opt.value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (colorByOnly) {
    return colorByToggle;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-medium text-gray-700">
            Radius: {radiusKm} km
          </label>
          <button
            onClick={toggleLimit}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {unlimited ? `Cap at ${DEFAULT_MAX} km` : "Remove limit"}
          </button>
        </div>
        <input
          type="range"
          min={3}
          max={maxKm}
          step={1}
          value={radiusKm}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>3 km</span>
          <span>{maxKm} km</span>
        </div>
      </div>

      <div className="space-y-2">
        <Tooltip text="Controls how fast weight drops with distance. n=1: gentle. n=2: inverse-square (gravity). n=3: very local.">
          <label className="text-sm font-medium text-gray-700 cursor-help border-b border-dashed border-gray-300">
            Exponent: {exponent.toFixed(1)} &mdash; 1/r<sup>{exponent === Math.round(exponent) ? exponent : exponent.toFixed(1)}</sup>
          </label>
        </Tooltip>
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

      {colorByToggle}
    </div>
  );
}
