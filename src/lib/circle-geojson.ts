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

export type ColorBy = "population" | "density" | "inverse-square";

export interface WedgeFeatureProps {
  innerKm: number;
  outerKm: number;
  startAngle: number;
  endAngle: number;
  population: number;
  inverseSqContribution: number;
  intensity: number;
}

/**
 * Generate a FeatureCollection of wedge polygons from wedge results.
 * Each wedge is an arc sector between inner and outer radius.
 */
export function createWedges(
  centerLng: number,
  centerLat: number,
  wedges: {
    innerKm: number;
    outerKm: number;
    startAngle: number;
    endAngle: number;
    population: number;
    density: number;
    inverseSqContribution: number;
    intensity: number;
  }[],
  colorBy: ColorBy = "inverse-square"
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  // Recompute intensity based on colorBy
  const values = wedges.map((w) => {
    if (colorBy === "density") return w.density;
    if (colorBy === "population") return w.population;
    return w.inverseSqContribution;
  });
  const maxVal = Math.max(...values, 1);
  const STEPS_PER_WEDGE = 6; // arc segments per wedge

  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = wedges.map((w, i) => {
    const intensity = values[i] / maxVal;
    const outerArc = arcCoords(centerLng, centerLat, w.outerKm, w.startAngle, w.endAngle, STEPS_PER_WEDGE);
    const props: WedgeFeatureProps = {
      innerKm: w.innerKm,
      outerKm: w.outerKm,
      startAngle: w.startAngle,
      endAngle: w.endAngle,
      population: w.population,
      inverseSqContribution: w.inverseSqContribution,
      intensity,
    };

    if (w.innerKm === 0) {
      // Pie slice from center
      const coords: [number, number][] = [
        [centerLng, centerLat],
        ...outerArc,
        [centerLng, centerLat],
      ];
      return {
        type: "Feature",
        properties: props,
        geometry: { type: "Polygon", coordinates: [coords] },
      };
    }

    // Arc sector: outer arc forward, inner arc backward
    const innerArc = arcCoords(centerLng, centerLat, w.innerKm, w.startAngle, w.endAngle, STEPS_PER_WEDGE).reverse();
    const coords: [number, number][] = [
      ...outerArc,
      ...innerArc,
      outerArc[0], // close
    ];

    return {
      type: "Feature",
      properties: props,
      geometry: { type: "Polygon", coordinates: [coords] },
    };
  });

  return { type: "FeatureCollection", features };
}

/**
 * Generate arc coordinates from startAngle to endAngle (degrees, 0=north, clockwise)
 * at a given radius from center.
 */
function arcCoords(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  startAngle: number,
  endAngle: number,
  steps: number
): [number, number][] {
  const coords: [number, number][] = [];
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;
  const d = radiusKm / EARTH_RADIUS;

  for (let i = 0; i <= steps; i++) {
    // Bearing in degrees (0 = north, clockwise)
    const bearingDeg = startAngle + (endAngle - startAngle) * (i / steps);
    const bearingRad = (bearingDeg * Math.PI) / 180;

    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(d) +
        Math.cos(latRad) * Math.sin(d) * Math.cos(bearingRad)
    );
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(d) * Math.cos(latRad),
        Math.cos(d) - Math.sin(latRad) * Math.sin(lat2)
      );

    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return coords;
}

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
