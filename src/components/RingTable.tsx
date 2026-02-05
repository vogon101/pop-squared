"use client";

import type { RingResult } from "@/lib/types";

interface RingTableProps {
  rings: RingResult[];
  exponent: number;
}

export default function RingTable({ rings, exponent }: RingTableProps) {
  if (rings.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-1.5 pr-2">Ring (km)</th>
            <th className="py-1.5 pr-2 text-right">Population</th>
            <th className="py-1.5 pr-2 text-right">Area (km&sup2;)</th>
            <th className="py-1.5 pr-2 text-right">Density</th>
            <th className="py-1.5 text-right">1/r<sup>{exponent === Math.round(exponent) ? exponent : exponent.toFixed(1)}</sup></th>
          </tr>
        </thead>
        <tbody>
          {rings.map((ring, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 text-gray-700"
            >
              <td className="py-1.5 pr-2">
                {ring.innerKm}&ndash;{ring.outerKm}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {ring.population.toLocaleString()}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {ring.areaSqKm.toLocaleString()}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {ring.density.toLocaleString()}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {ring.inverseSqContribution.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
