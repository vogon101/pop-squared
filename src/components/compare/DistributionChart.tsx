"use client";

interface Band {
  label: string;
  valueA: number;
  valueB: number;
}

interface DistributionChartProps {
  bands: Band[];
  colorA?: string;
  colorB?: string;
}

export default function DistributionChart({
  bands,
  colorA = "#1e40af",
  colorB = "#c2410c",
}: DistributionChartProps) {
  if (bands.length === 0) return null;

  const maxVal = Math.max(
    ...bands.map((b) => Math.max(b.valueA, b.valueB)),
    1
  );

  const barHeight = 20;
  const gap = 4;
  const labelWidth = 70;
  const chartWidth = 400;
  const halfChart = (chartWidth - labelWidth) / 2;
  const centerX = halfChart;
  const totalHeight = bands.length * (barHeight + gap) - gap;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${totalHeight + 20}`}
      className="w-full"
      role="img"
      aria-label="Distribution comparison chart"
    >
      {/* Header labels */}
      <text x={centerX / 2} y={12} textAnchor="middle" className="fill-blue-700 text-[10px] font-medium">
        A
      </text>
      <text x={centerX + labelWidth + halfChart / 2} y={12} textAnchor="middle" className="fill-orange-700 text-[10px] font-medium">
        B
      </text>

      {bands.map((band, i) => {
        const y = 18 + i * (barHeight + gap);
        const widthA = maxVal > 0 ? (band.valueA / maxVal) * (halfChart - 8) : 0;
        const widthB = maxVal > 0 ? (band.valueB / maxVal) * (halfChart - 8) : 0;

        return (
          <g key={band.label}>
            {/* A bar (extends left from center) */}
            <rect
              x={centerX - widthA}
              y={y}
              width={widthA}
              height={barHeight}
              fill={colorA}
              opacity={0.75}
              rx={2}
            />
            {/* Band label (center) */}
            <text
              x={centerX + labelWidth / 2}
              y={y + barHeight / 2 + 4}
              textAnchor="middle"
              className="fill-gray-600 text-[9px]"
            >
              {band.label}
            </text>
            {/* B bar (extends right from center) */}
            <rect
              x={centerX + labelWidth}
              y={y}
              width={widthB}
              height={barHeight}
              fill={colorB}
              opacity={0.75}
              rx={2}
            />
          </g>
        );
      })}
    </svg>
  );
}
