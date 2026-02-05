export interface TravelTimeCell {
  lat: number;
  lng: number;
  pop: number;
  driving: number | null;  // seconds, null = unreachable
  transit: number | null;  // seconds, null = unreachable
}

export interface OriginResult {
  origin: {
    id: string;
    name: string;
    lat: number;
    lng: number;
  };
  computedAt: string;
  maxTravelTimeSec: number;
  searchRadiusKm: number;
  cells: TravelTimeCell[];
}

export type TransportMode = "driving" | "transit" | "fastest";

export interface TimeBand {
  minMin: number;
  maxMin: number;
  population: number;
  weightedContribution: number;
  cellCount: number;
}

export const TIME_BANDS: [number, number][] = [
  [0, 15],
  [15, 30],
  [30, 45],
  [45, 60],
  [60, 90],
  [90, 120],
  [120, 180],
];
