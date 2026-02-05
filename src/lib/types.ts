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

export interface PopulationResult {
  totalPopulation: number;
  inverseSqSum: number;
  inverseSqNormalized: number;
  rings: RingResult[];
  pixelsProcessed: number;
  computeTimeMs: number;
  center: { lat: number; lng: number };
  radiusKm: number;
}
