"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type {
  OriginResult,
  TravelTimeCell,
  TransportMode,
  TimeBand,
} from "@/lib/travel-time-types";
import { haversineDistance } from "@/lib/geo";

interface ComputedResults {
  totalReachable: number;
  totalPopulation: number;
  rawSum: number;
  normalized: number;
  timeBands: TimeBand[];
  cells: (TravelTimeCell & { time: number; weight: number })[];
  /** % of all reachable cells that have transit data */
  transitCoveragePct: number;
  /** % of all reachable cells that have driving data */
  drivingCoveragePct: number;
  /** % of cells within 50km that have transit data (urban core quality) */
  transitNearPct: number;
}

interface UseTravelTimeDataReturn {
  data: OriginResult | null;
  loading: boolean;
  error: string | null;
  results: ComputedResults | null;
}

function getTravelTime(cell: TravelTimeCell, mode: TransportMode): number | null {
  if (mode === "driving") return cell.driving;
  if (mode === "transit") return cell.transit;
  // fastest: min of both, ignoring nulls
  if (cell.driving !== null && cell.transit !== null) {
    return Math.min(cell.driving, cell.transit);
  }
  return cell.driving ?? cell.transit;
}

const TIME_BAND_RANGES: [number, number][] = [
  [0, 15],
  [15, 30],
  [30, 45],
  [45, 60],
  [60, 90],
  [90, 120],
  [120, 180],
];

export function useTravelTimeData(
  originId: string | null,
  mode: TransportMode,
  exponent: number,
  maxTimeMin: number
): UseTravelTimeDataReturn {
  const [data, setData] = useState<OriginResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch data when origin changes
  useEffect(() => {
    if (!originId) {
      setData(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetch(`/api/travel-time/results/${originId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((result: OriginResult) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      });

    return () => controller.abort();
  }, [originId]);

  // Compute weights client-side (instant, no API call)
  const results = useMemo(() => {
    if (!data) return null;

    const maxTimeSec = maxTimeMin * 60;
    const MIN_TIME_SEC = 60; // 1 minute minimum to avoid division by near-zero

    const filteredCells: (TravelTimeCell & { time: number; weight: number })[] = [];
    let rawSum = 0;
    let weightSum = 0;
    let totalPopulation = 0;

    for (const cell of data.cells) {
      const time = getTravelTime(cell, mode);
      if (time === null || time > maxTimeSec) continue;

      const t = Math.max(time, MIN_TIME_SEC);
      const weight = 1 / Math.pow(t, exponent);
      const contribution = cell.pop * weight;

      filteredCells.push({ ...cell, time, weight: contribution });
      rawSum += contribution;
      weightSum += weight;
      totalPopulation += cell.pop;
    }

    // Time bands
    const timeBands: TimeBand[] = TIME_BAND_RANGES.map(([minMin, maxMin]) => ({
      minMin,
      maxMin,
      population: 0,
      weightedContribution: 0,
      cellCount: 0,
    }));

    for (const cell of filteredCells) {
      const timeMin = cell.time / 60;
      for (const band of timeBands) {
        if (timeMin >= band.minMin && timeMin < band.maxMin) {
          band.population += cell.pop;
          band.weightedContribution += cell.weight;
          band.cellCount++;
          break;
        }
      }
    }

    // Coverage stats from raw data (independent of mode/time filter)
    const totalCells = data.cells.length;
    let transitCells = 0;
    let drivingCells = 0;
    let nearTotal = 0;
    let nearTransit = 0;
    const oLat = data.origin.lat;
    const oLng = data.origin.lng;
    for (const c of data.cells) {
      if (c.transit !== null) transitCells++;
      if (c.driving !== null) drivingCells++;
      if (haversineDistance(oLat, oLng, c.lat, c.lng) < 50) {
        nearTotal++;
        if (c.transit !== null) nearTransit++;
      }
    }

    return {
      totalReachable: filteredCells.length,
      totalPopulation,
      rawSum: Math.round(rawSum * 100) / 100,
      normalized: weightSum > 0 ? Math.round((rawSum / weightSum) * 100) / 100 : 0,
      timeBands,
      cells: filteredCells,
      transitCoveragePct: totalCells > 0 ? Math.round((transitCells / totalCells) * 1000) / 10 : 0,
      drivingCoveragePct: totalCells > 0 ? Math.round((drivingCells / totalCells) * 1000) / 10 : 0,
      transitNearPct: nearTotal > 0 ? Math.round((nearTransit / nearTotal) * 1000) / 10 : 0,
    };
  }, [data, mode, exponent, maxTimeMin]);

  return { data, loading, error, results };
}
