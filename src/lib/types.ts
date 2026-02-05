export interface PopulationQuery {
  lat: number;
  lng: number;
  radiusKm: number;
  exponent: number;
}

export interface RingResult {
  innerKm: number;
  outerKm: number;
  population: number;
  inverseSqContribution: number;
  areaSqKm: number;
  density: number;
}

export interface WedgeResult {
  ringIdx: number;
  sectorIdx: number;
  innerKm: number;
  outerKm: number;
  startAngle: number; // degrees, 0 = north, clockwise
  endAngle: number;
  population: number;
  areaSqKm: number;
  density: number;
  inverseSqContribution: number;
  /** 0–1 normalized intensity for coloring */
  intensity: number;
}

export interface PopulationResult {
  totalPopulation: number;
  inverseSqSum: number;
  inverseSqNormalized: number;
  rings: RingResult[];
  wedges: WedgeResult[];
  pixelsProcessed: number;
  computeTimeMs: number;
  center: { lat: number; lng: number };
  radiusKm: number;
}
