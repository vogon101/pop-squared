const EARTH_RADIUS_KM = 6371;

/** Haversine distance in km between two lat/lng points */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Initial bearing from point 1 to point 2 in degrees [0, 360) */
export function bearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/** Bounding box for a circle, returns [minLng, minLat, maxLng, maxLat] */
export function boundingBox(
  lat: number,
  lng: number,
  radiusKm: number
): [number, number, number, number] {
  const dLat = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

/**
 * Approximate area of a single pixel at a given latitude.
 * For 30-arcsecond grid: pixel is 1/120 degree on each side.
 */
export function pixelAreaKm2(lat: number, pixelSizeDeg: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  // Height in km
  const heightKm = (pixelSizeDeg / 360) * 2 * Math.PI * EARTH_RADIUS_KM;
  // Width depends on latitude
  const widthKm =
    (pixelSizeDeg / 360) *
    2 *
    Math.PI *
    EARTH_RADIUS_KM *
    Math.cos(toRad(lat));
  return heightKm * widthKm;
}
