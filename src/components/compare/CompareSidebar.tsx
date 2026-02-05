"use client";

import ModePicker, { type CompareMode } from "./ModePicker";
import DistanceControls from "./DistanceControls";
import TimeControls from "./TimeControls";
import MetricCards from "./MetricCards";
import BreakdownTable, { type BandRow } from "./BreakdownTable";
import DistributionChart from "./DistributionChart";
import type { PopulationResult, RingResult } from "@/lib/types";
import type { TransportMode, TimeBand } from "@/lib/travel-time-types";

interface OriginInfo {
  id: string;
  name: string;
  type: "city" | "airport";
  country: string;
  computed: boolean;
}

interface TravelTimeResults {
  totalReachable: number;
  totalPopulation: number;
  rawSum: number;
  normalized: number;
  timeBands: TimeBand[];
}

interface CompareSidebarProps {
  // Mode
  compareMode: CompareMode;
  onCompareModeChange: (m: CompareMode) => void;

  // Distance state
  activePin: "A" | "B";
  onActivePinChange: (pin: "A" | "B") => void;
  latA: number | null;
  lngA: number | null;
  latB: number | null;
  lngB: number | null;
  radiusKm: number;
  onRadiusChange: (r: number) => void;
  exponentDist: number;
  onExponentDistChange: (e: number) => void;
  distResultA: PopulationResult | null;
  distResultB: PopulationResult | null;
  distLoadingA: boolean;
  distLoadingB: boolean;
  distErrorA: string | null;
  distErrorB: string | null;

  // Time state
  origins: OriginInfo[];
  originA: string | null;
  onOriginAChange: (id: string | null) => void;
  originB: string | null;
  onOriginBChange: (id: string | null) => void;
  transportMode: TransportMode;
  onTransportModeChange: (m: TransportMode) => void;
  exponentTime: number;
  onExponentTimeChange: (e: number) => void;
  maxTimeMin: number;
  onMaxTimeChange: (m: number) => void;
  timeResultsA: TravelTimeResults | null;
  timeResultsB: TravelTimeResults | null;
  timeLoadingA: boolean;
  timeLoadingB: boolean;
  timeErrorA: string | null;
  timeErrorB: string | null;
}

function buildDistanceMetrics(a: PopulationResult | null, b: PopulationResult | null) {
  return [
    {
      label: "Total Population",
      valueA: a?.totalPopulation ?? null,
      valueB: b?.totalPopulation ?? null,
    },
    {
      label: "Raw Gravity",
      sublabel: "\u03A3 pop/r\u207F",
      valueA: a?.inverseSqSum ?? null,
      valueB: b?.inverseSqSum ?? null,
    },
    {
      label: "Normalized",
      sublabel: "pop-weighted avg",
      valueA: a?.inverseSqNormalized ?? null,
      valueB: b?.inverseSqNormalized ?? null,
    },
  ];
}

function buildTimeMetrics(a: TravelTimeResults | null, b: TravelTimeResults | null) {
  return [
    {
      label: "Reachable Pop",
      valueA: a?.totalPopulation ?? null,
      valueB: b?.totalPopulation ?? null,
    },
    {
      label: "Raw Gravity",
      sublabel: "\u03A3 pop/t\u207F",
      valueA: a?.rawSum ?? null,
      valueB: b?.rawSum ?? null,
    },
    {
      label: "Normalized",
      sublabel: "pop-weighted avg",
      valueA: a?.normalized ?? null,
      valueB: b?.normalized ?? null,
    },
  ];
}

function buildDistanceBands(a: PopulationResult | null, b: PopulationResult | null): BandRow[] {
  // Use whichever result has rings, they share the same boundaries
  const ringsA = a?.rings ?? [];
  const ringsB = b?.rings ?? [];
  const maxLen = Math.max(ringsA.length, ringsB.length);
  if (maxLen === 0) return [];

  const bands: BandRow[] = [];
  for (let i = 0; i < maxLen; i++) {
    const ra: RingResult | undefined = ringsA[i];
    const rb: RingResult | undefined = ringsB[i];
    const ring = ra ?? rb;
    if (!ring) continue;
    bands.push({
      label: `${ring.innerKm}\u2013${ring.outerKm} km`,
      popA: ra?.population ?? null,
      weightA: ra?.inverseSqContribution ?? null,
      popB: rb?.population ?? null,
      weightB: rb?.inverseSqContribution ?? null,
    });
  }
  return bands;
}

function buildTimeBands(a: TravelTimeResults | null, b: TravelTimeResults | null): BandRow[] {
  const bandsA = a?.timeBands ?? [];
  const bandsB = b?.timeBands ?? [];
  const maxLen = Math.max(bandsA.length, bandsB.length);
  if (maxLen === 0) return [];

  const bands: BandRow[] = [];
  for (let i = 0; i < maxLen; i++) {
    const ba = bandsA[i];
    const bb = bandsB[i];
    const band = ba ?? bb;
    if (!band) continue;
    bands.push({
      label: `${band.minMin}\u2013${band.maxMin} min`,
      popA: ba ? ba.population : null,
      weightA: ba ? ba.weightedContribution : null,
      popB: bb ? bb.population : null,
      weightB: bb ? bb.weightedContribution : null,
    });
  }
  return bands;
}

function buildDistChartBands(a: PopulationResult | null, b: PopulationResult | null) {
  const ringsA = a?.rings ?? [];
  const ringsB = b?.rings ?? [];
  const maxLen = Math.max(ringsA.length, ringsB.length);
  const bands = [];
  for (let i = 0; i < maxLen; i++) {
    const ra = ringsA[i];
    const rb = ringsB[i];
    const ring = ra ?? rb;
    if (!ring) continue;
    bands.push({
      label: `${ring.innerKm}\u2013${ring.outerKm}`,
      valueA: ra?.population ?? 0,
      valueB: rb?.population ?? 0,
    });
  }
  return bands;
}

function buildTimeChartBands(a: TravelTimeResults | null, b: TravelTimeResults | null) {
  const bandsA = a?.timeBands ?? [];
  const bandsB = b?.timeBands ?? [];
  const maxLen = Math.max(bandsA.length, bandsB.length);
  const bands = [];
  for (let i = 0; i < maxLen; i++) {
    const ba = bandsA[i];
    const bb = bandsB[i];
    const band = ba ?? bb;
    if (!band) continue;
    bands.push({
      label: `${band.minMin}\u2013${band.maxMin}`,
      valueA: ba?.population ?? 0,
      valueB: bb?.population ?? 0,
    });
  }
  return bands;
}

export default function CompareSidebar(props: CompareSidebarProps) {
  const isDistance = props.compareMode === "distance";

  const metricRows = isDistance
    ? buildDistanceMetrics(props.distResultA, props.distResultB)
    : buildTimeMetrics(props.timeResultsA, props.timeResultsB);

  const bandRows = isDistance
    ? buildDistanceBands(props.distResultA, props.distResultB)
    : buildTimeBands(props.timeResultsA, props.timeResultsB);

  const chartBands = isDistance
    ? buildDistChartBands(props.distResultA, props.distResultB)
    : buildTimeChartBands(props.timeResultsA, props.timeResultsB);

  const loadingA = isDistance ? props.distLoadingA : props.timeLoadingA;
  const loadingB = isDistance ? props.distLoadingB : props.timeLoadingB;
  const errorA = isDistance ? props.distErrorA : props.timeErrorA;
  const errorB = isDistance ? props.distErrorB : props.timeErrorB;

  const hasData = isDistance
    ? props.distResultA !== null || props.distResultB !== null
    : props.timeResultsA !== null || props.timeResultsB !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">Compare</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Side-by-side comparison of two locations
        </p>
      </div>

      {/* Mode Picker */}
      <div className="p-5 border-b border-gray-100">
        <ModePicker mode={props.compareMode} onChange={props.onCompareModeChange} />
      </div>

      {/* Controls */}
      <div className="p-5 border-b border-gray-100">
        {isDistance ? (
          <DistanceControls
            activePin={props.activePin}
            onActivePinChange={props.onActivePinChange}
            latA={props.latA}
            lngA={props.lngA}
            latB={props.latB}
            lngB={props.lngB}
            radiusKm={props.radiusKm}
            onRadiusChange={props.onRadiusChange}
            exponent={props.exponentDist}
            onExponentChange={props.onExponentDistChange}
          />
        ) : (
          <TimeControls
            origins={props.origins}
            originA={props.originA}
            onOriginAChange={props.onOriginAChange}
            originB={props.originB}
            onOriginBChange={props.onOriginBChange}
            transportMode={props.transportMode}
            onTransportModeChange={props.onTransportModeChange}
            exponent={props.exponentTime}
            onExponentChange={props.onExponentTimeChange}
            maxTimeMin={props.maxTimeMin}
            onMaxTimeChange={props.onMaxTimeChange}
          />
        )}
      </div>

      {/* Errors */}
      {(errorA || errorB) && (
        <div className="p-5 border-b border-gray-100 space-y-2">
          {errorA && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-700">A: {errorA}</p>
            </div>
          )}
          {errorB && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-700">B: {errorB}</p>
            </div>
          )}
        </div>
      )}

      {/* Metrics */}
      <div className="p-5 border-b border-gray-100">
        <MetricCards
          mode={props.compareMode}
          rows={metricRows}
          loadingA={loadingA}
          loadingB={loadingB}
        />
        {!hasData && !loadingA && !loadingB && !errorA && !errorB && (
          <p className="text-sm text-gray-500 text-center">
            {isDistance
              ? "Click the map to place markers A and B."
              : "Select two origins to compare."}
          </p>
        )}
      </div>

      {/* Breakdown Table */}
      {bandRows.length > 0 && (
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Breakdown</h3>
          <BreakdownTable
            bands={bandRows}
            weightHeader={isDistance ? "1/r\u207F" : "1/t\u207F"}
          />
        </div>
      )}

      {/* Distribution Chart */}
      {chartBands.length > 0 && hasData && (
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Distribution</h3>
          <DistributionChart bands={chartBands} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto p-4 text-xs text-gray-400 border-t border-gray-100 space-y-1">
        <p>Data: GHSL GHS-POP R2023A (JRC)</p>
        <p>
          Location data analysis provided by{" "}
          <a href="https://docs.traveltime.com/api/overview/introduction" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">TravelTime</a>
        </p>
      </div>
    </div>
  );
}
