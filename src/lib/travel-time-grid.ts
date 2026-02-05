import { fromFile, fromUrl, GeoTIFF, GeoTIFFImage } from "geotiff";
import path from "path";
import { boundingBox } from "./geo";

const TIFF_FILENAME = "GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.tif";

let cachedTiff: GeoTIFF | null = null;
let cachedImage: GeoTIFFImage | null = null;

async function getImage(): Promise<GeoTIFFImage> {
  if (cachedImage) return cachedImage;

  const remoteUrl = process.env.GEOTIFF_URL;
  if (remoteUrl) {
    cachedTiff = await fromUrl(remoteUrl);
  } else {
    const tifPath = path.join(process.cwd(), "data", TIFF_FILENAME);
    cachedTiff = await fromFile(tifPath);
  }

  cachedImage = await cachedTiff.getImage();
  return cachedImage;
}

export interface GridCell {
  lat: number;
  lng: number;
  pop: number;
}

/**
 * Extract all populated cells within a bounding box around a point.
 * Returns cells with pop > 0 within `radiusKm` of (lat, lng).
 */
export async function extractPopulatedCells(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<{ cells: GridCell[]; pixelSizeDeg: number }> {
  const image = await getImage();
  const [originX, originY] = image.getOrigin();
  const [resX, resY] = image.getResolution();
  const width = image.getWidth();
  const height = image.getHeight();

  const [minLng, minLat, maxLng, maxLat] = boundingBox(lat, lng, radiusKm);

  // Convert to pixel coordinates (same pattern as population.ts)
  const col0 = Math.max(0, Math.floor((minLng - originX) / resX));
  const col1 = Math.min(width - 1, Math.ceil((maxLng - originX) / resX));
  const row0 = Math.max(0, Math.floor((maxLat - originY) / resY)); // resY is negative
  const row1 = Math.min(height - 1, Math.ceil((minLat - originY) / resY));

  const rasterData = await image.readRasters({
    window: [col0, row0, col1 + 1, row1 + 1],
  });
  const data = rasterData[0] as Float32Array | Float64Array;
  const readWidth = col1 - col0 + 1;

  const cells: GridCell[] = [];
  const pixelSizeDeg = Math.abs(resX);

  for (let row = row0; row <= row1; row++) {
    const pixelLat = originY + (row + 0.5) * resY;
    for (let col = col0; col <= col1; col++) {
      const pixelLng = originX + (col + 0.5) * resX;

      const idx = (row - row0) * readWidth + (col - col0);
      const pop = data[idx];

      if (pop <= 0 || isNaN(pop)) continue;

      // Round to 4 decimal places (~11m precision, plenty for 1km grid)
      cells.push({
        lat: Math.round(pixelLat * 10000) / 10000,
        lng: Math.round(pixelLng * 10000) / 10000,
        pop: Math.round(pop),
      });
    }
  }

  return { cells, pixelSizeDeg };
}
