/** Generate a GeoJSON polygon approximating a circle on the globe */
export function createCircle(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  steps: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const earthRadius = 6371;

  for (let i = 0; i <= steps; i++) {
    const angle = (i * 360) / steps;
    const rad = (angle * Math.PI) / 180;

    const latRad = (centerLat * Math.PI) / 180;
    const lngRad = (centerLng * Math.PI) / 180;
    const d = radiusKm / earthRadius;

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

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}
