"use client";

interface Band {
  label: string;
  value: number;
}

interface SingleBarChartProps {
  bands: Band[];
  color?: string;
}

export default function SingleBarChart({
  bands,
  color = "#1e40af",
}: SingleBarChartProps) {
  if (bands.length === 0) return null;

  const maxVal = Math.max(...bands.map((b) => b.value), 1);

  const barHeight = 20;
  const gap = 4;
  const labelWidth = 55;
  const chartWidth = 400;
  const barArea = chartWidth - labelWidth - 8;
  const totalHeight = bands.length * (barHeight + gap) - gap;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${totalHeight}`}
      className="w-full"
      role="img"
      aria-label="Distribution chart"
    >
      {bands.map((band, i) => {
        const y = i * (barHeight + gap);
        const w = maxVal > 0 ? (band.value / maxVal) * barArea : 0;

        return (
          <g key={band.label}>
            <text
              x={labelWidth - 4}
              y={y + barHeight / 2 + 4}
              textAnchor="end"
              className="fill-gray-600 text-[9px]"
            >
              {band.label}
            </text>
            <rect
              x={labelWidth}
              y={y}
              width={w}
              height={barHeight}
              fill={color}
              opacity={0.75}
              rx={2}
            />
          </g>
        );
      })}
    </svg>
  );
}
