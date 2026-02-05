import type { TravelTimeCell } from "./travel-time-types";

// Pixel size for 30-arcsecond grid (~1km)
const PIXEL_SIZE_DEG = 1 / 120;

// Merge cells into NxN supercells for display performance
const DOWNSAMPLE = 4; // 4x4 = ~4km tiles, reduces ~30K → ~2K features
const SUPER_SIZE_DEG = PIXEL_SIZE_DEG * DOWNSAMPLE;

interface SuperCell {
  // grid key coords (snapped to supercell grid)
  gLat: number;
  gLng: number;
  totalPop: number;
  totalWeight: number;
  // population-weighted average travel time
  sumPopTime: number;
  count: number;
}

export function buildSuperCells(
  cells: (TravelTimeCell & { time: number; weight: number })[]
): GeoJSON.FeatureCollection {
  // Bin cells into supercells keyed by snapped grid position
  const map = new Map<string, SuperCell>();

  for (const c of cells) {
    // Snap to supercell grid
    const gLat = Math.floor(c.lat / SUPER_SIZE_DEG) * SUPER_SIZE_DEG;
    const gLng = Math.floor(c.lng / SUPER_SIZE_DEG) * SUPER_SIZE_DEG;
    const key = `${gLat},${gLng}`;

    let sc = map.get(key);
    if (!sc) {
      sc = { gLat, gLng, totalPop: 0, totalWeight: 0, sumPopTime: 0, count: 0 };
      map.set(key, sc);
    }
    sc.totalPop += c.pop;
    sc.totalWeight += c.weight;
    sc.sumPopTime += c.pop * c.time;
    sc.count++;
  }

  const features: GeoJSON.Feature[] = [];
  const half = SUPER_SIZE_DEG / 2;

  for (const sc of map.values()) {
    const avgTime = sc.totalPop > 0 ? sc.sumPopTime / sc.totalPop : 0;
    const cx = sc.gLng + half;
    const cy = sc.gLat + half;

    features.push({
      type: "Feature",
      properties: {
        travelTimeMin: Math.round(avgTime / 60),
        weight: sc.totalWeight,
        pop: sc.totalPop,
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [cx - half, cy - half],
          [cx + half, cy - half],
          [cx + half, cy + half],
          [cx - half, cy + half],
          [cx - half, cy - half],
        ]],
      },
    });
  }

  return { type: "FeatureCollection", features };
}
