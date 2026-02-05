const EARTH_RADIUS = 6371;

/** Generate coordinates for a circle on the globe */
function circleCoords(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  steps: number = 64
): [number, number][] {
  const coords: [number, number][] = [];
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;
  const d = radiusKm / EARTH_RADIUS;

  for (let i = 0; i <= steps; i++) {
    const angle = (i * 360) / steps;
    const rad = (angle * Math.PI) / 180;

    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(d) +
        Math.cos(latRad) * Math.sin(d) * Math.cos(rad)
    );
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(rad) * Math.sin(d) * Math.cos(latRad),
        Math.cos(d) - Math.sin(latRad) * Math.sin(lat2)
      );

    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return coords;
}

/** Generate a simple circle polygon */
export function createCircle(
  centerLng: number,
  centerLat: number,
  radiusKm: number
): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [circleCoords(centerLng, centerLat, radiusKm)],
    },
  };
}

export interface RingFeatureProps {
  innerKm: number;
  outerKm: number;
  inverseSqContribution: number;
  population: number;
  density: number;
  /** 0–1 normalized intensity for coloring */
  intensity: number;
}

export type ColorBy = "density" | "inverse-square";

/**
 * Generate a FeatureCollection of ring annuli, each with properties
 * including a normalized intensity for data-driven styling.
 */
export function createRings(
  centerLng: number,
  centerLat: number,
  rings: {
    innerKm: number;
    outerKm: number;
    inverseSqContribution: number;
    population: number;
    density: number;
  }[],
  colorBy: ColorBy = "inverse-square"
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const values = rings.map((r) =>
    colorBy === "density" ? r.density : r.inverseSqContribution
  );
  const maxVal = Math.max(...values, 1);

  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = rings.map((ring) => {
    const outerCoords = circleCoords(centerLng, centerLat, ring.outerKm);
    const raw = colorBy === "density" ? ring.density : ring.inverseSqContribution;
    const intensity = raw / maxVal;

    if (ring.innerKm === 0) {
      // Innermost ring is a filled circle
      return {
        type: "Feature",
        properties: {
          innerKm: ring.innerKm,
          outerKm: ring.outerKm,
          inverseSqContribution: ring.inverseSqContribution,
          population: ring.population,
          density: ring.density,
          intensity,
        } satisfies RingFeatureProps,
        geometry: {
          type: "Polygon",
          coordinates: [outerCoords],
        },
      };
    }

    // Annulus: outer ring + inner hole (reversed winding)
    const innerCoords = circleCoords(
      centerLng,
      centerLat,
      ring.innerKm
    ).reverse();

    return {
      type: "Feature",
      properties: {
        innerKm: ring.innerKm,
        outerKm: ring.outerKm,
        inverseSqContribution: ring.inverseSqContribution,
        population: ring.population,
        density: ring.density,
        intensity,
      } satisfies RingFeatureProps,
      geometry: {
        type: "Polygon",
        coordinates: [outerCoords, innerCoords],
      },
    };
  });

  return { type: "FeatureCollection", features };
}
