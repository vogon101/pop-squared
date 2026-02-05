"use client";

import { useState } from "react";
import type { ColorBy } from "@/lib/circle-geojson";

const DEFAULT_MAX = 100;
const UNLIMITED_MAX = 500;

interface ControlsProps {
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  exponent: number;
  onExponentChange: (exponent: number) => void;
  colorBy: ColorBy;
  onColorByChange: (colorBy: ColorBy) => void;
}

export default function Controls({
  radiusKm,
  onRadiusChange,
  exponent,
  onExponentChange,
  colorBy,
  onColorByChange,
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
        <label className="text-sm font-medium text-gray-700">
          Exponent: {exponent.toFixed(1)} &mdash; 1/r<sup>{exponent === Math.round(exponent) ? exponent : exponent.toFixed(1)}</sup>
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Colour by
        </label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => onColorByChange("density")}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              colorBy === "density"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Population
          </button>
          <button
            onClick={() => onColorByChange("inverse-square")}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              colorBy === "inverse-square"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            1/r² Weight
          </button>
        </div>
      </div>
    </div>
  );
}
