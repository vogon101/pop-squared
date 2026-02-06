import { fromFile, fromUrl, GeoTIFF, GeoTIFFImage } from "geotiff";
import path from "path";

const TIFF_FILENAME = "GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.tif";

let cachedImage: GeoTIFFImage | null = null;
let imagePromise: Promise<GeoTIFFImage> | null = null;

/**
 * Returns the shared GeoTIFFImage, opening the file on first call.
 * Safe to call concurrently — deduplicates the open.
 */
export async function getImage(): Promise<GeoTIFFImage> {
  if (cachedImage) return cachedImage;

  // Deduplicate: if another caller is already opening, wait on the same promise
  if (imagePromise) return imagePromise;

  imagePromise = openImage();
  try {
    cachedImage = await imagePromise;
    return cachedImage;
  } catch (err) {
    imagePromise = null; // allow retry on failure
    throw err;
  }
}

async function openImage(): Promise<GeoTIFFImage> {
  const remoteUrl = process.env.GEOTIFF_URL;
  let tiff: GeoTIFF;
  try {
    if (remoteUrl) {
      tiff = await fromUrl(remoteUrl);
    } else {
      const tifPath = path.join(process.cwd(), "data", TIFF_FILENAME);
      tiff = await fromFile(tifPath);
    }
    return await tiff.getImage();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    if (remoteUrl) {
      throw new Error(
        `Could not load population data from remote URL. Check that GEOTIFF_URL is correct. (${detail})`
      );
    }
    throw new Error(
      `Population data file not found. Run "bash scripts/download-data.sh" to download it, or set GEOTIFF_URL for remote access. (${detail})`
    );
  }
}

/**
 * Mutex for readRasters — geotiff doesn't support concurrent reads on the
 * same image. All callers queue through this.
 */
let readQueue: Promise<unknown> = Promise.resolve();

export async function readRastersExclusive(
  image: GeoTIFFImage,
  window: [number, number, number, number]
): Promise<Float32Array | Float64Array> {
  // Chain onto the queue so only one readRasters runs at a time
  const result = readQueue.then(async () => {
    const rasterData = await image.readRasters({ window });
    return rasterData[0] as Float32Array | Float64Array;
  });
  // Update the queue tail (swallow rejections so the queue keeps moving)
  readQueue = result.then(() => {}, () => {});
  return result;
}
