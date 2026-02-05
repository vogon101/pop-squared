"use client";

export interface BandRow {
  label: string;
  popA: number | null;
  weightA: number | null;
  popB: number | null;
  weightB: number | null;
}

interface BreakdownTableProps {
  bands: BandRow[];
  weightHeader: string;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(Math.round(n));
}

function formatWeight(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(1);
}

export default function BreakdownTable({ bands, weightHeader }: BreakdownTableProps) {
  if (bands.length === 0) return null;

  // Compute cumulative populations
  let cumA = 0;
  let cumB = 0;
  const rows = bands.map((b) => {
    if (b.popA !== null) cumA += b.popA;
    if (b.popB !== null) cumB += b.popB;
    return { ...b, cumA: b.popA !== null ? cumA : null, cumB: b.popB !== null ? cumB : null };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-1.5 pr-1 text-right text-blue-600">Cum</th>
            <th className="py-1.5 pr-1 text-right text-blue-600">Pop</th>
            <th className="py-1.5 pr-1 text-right text-blue-600">{weightHeader}</th>
            <th className="py-1.5 px-2 text-center text-gray-600">Band</th>
            <th className="py-1.5 pl-1 text-left text-orange-600">{weightHeader}</th>
            <th className="py-1.5 pl-1 text-left text-orange-600">Pop</th>
            <th className="py-1.5 pl-1 text-left text-orange-600">Cum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-gray-100">
              <td className="py-1.5 pr-1 text-right text-blue-700">
                {row.cumA !== null ? formatCompact(row.cumA) : "--"}
              </td>
              <td className="py-1.5 pr-1 text-right text-blue-800">
                {row.popA !== null ? row.popA.toLocaleString() : "--"}
              </td>
              <td className="py-1.5 pr-1 text-right text-blue-800">
                {row.weightA !== null ? formatWeight(row.weightA) : "--"}
              </td>
              <td className="py-1.5 px-2 text-center text-gray-600 whitespace-nowrap">
                {row.label}
              </td>
              <td className="py-1.5 pl-1 text-left text-orange-800">
                {row.weightB !== null ? formatWeight(row.weightB) : "--"}
              </td>
              <td className="py-1.5 pl-1 text-left text-orange-800">
                {row.popB !== null ? row.popB.toLocaleString() : "--"}
              </td>
              <td className="py-1.5 pl-1 text-left text-orange-700">
                {row.cumB !== null ? formatCompact(row.cumB) : "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
