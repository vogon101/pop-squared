"use client";

import type { PopulationResult } from "@/lib/types";

interface ResultsProps {
  result: PopulationResult | null;
  loading: boolean;
  error: string | null;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(2) + "M";
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1) + "K";
  }
  return n.toLocaleString();
}

export default function Results({ result, loading, error }: ResultsProps) {
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Calculating...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <p className="text-sm text-gray-500">
        Click on the map to calculate population.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Population within {result.radiusKm} km
        </p>
        <p className="text-3xl font-bold text-gray-900">
          {result.totalPopulation.toLocaleString()}
        </p>
        <p className="text-xs text-gray-400">
          {formatNumber(result.totalPopulation)} people
        </p>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-medium">
            Inverse-Square Gravity
          </p>
          <p className="text-xs text-blue-400 mt-1">
            Weights each person by 1/r&sup2; from the centre, like gravitational
            pull. Nearby people count far more than distant ones.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-blue-500 font-medium">Raw</p>
            <p className="text-lg font-semibold text-blue-900">
              {result.inverseSqSum.toLocaleString()}
            </p>
            <p className="text-xs text-blue-400 mt-0.5">
              &Sigma;(pop / r&sup2;) &mdash; total &ldquo;gravitational
              pull&rdquo; in people/km&sup2;. Higher means more people
              packed close to this point.
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-500 font-medium">Normalized</p>
            <p className="text-lg font-semibold text-blue-900">
              {result.inverseSqNormalized.toLocaleString()}
            </p>
            <p className="text-xs text-blue-400 mt-0.5">
              Raw / &Sigma;(1/r&sup2;) &mdash; a distance-weighted average
              population per cell. Removes the effect of radius choice so
              you can compare locations fairly.
            </p>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-400 flex gap-3">
        <span>{result.pixelsProcessed.toLocaleString()} pixels</span>
        <span>{result.computeTimeMs} ms</span>
      </div>
    </div>
  );
}
