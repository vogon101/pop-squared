import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { ORIGINS } from "@/lib/origins";

const RESULTS_DIR = path.join(process.cwd(), "data", "travel-time");

interface ManifestEntry {
  id: string;
  cellCount: number;
}

let cachedRemoteManifest: ManifestEntry[] | null = null;

async function getRemoteManifest(): Promise<ManifestEntry[]> {
  if (cachedRemoteManifest) return cachedRemoteManifest;
  const remoteBase = process.env.TRAVEL_TIME_URL;
  if (!remoteBase) return [];
  try {
    const res = await fetch(`${remoteBase}/manifest.json`);
    if (res.ok) {
      cachedRemoteManifest = await res.json();
      return cachedRemoteManifest!;
    }
  } catch {
    // Remote manifest unavailable
  }
  return [];
}

export async function GET() {
  const remoteManifest = await getRemoteManifest();
  const remoteMap = new Map(remoteManifest.map((e) => [e.id, e.cellCount]));

  const origins = await Promise.all(
    ORIGINS.map(async (origin) => {
      // Check local file first
      const filePath = path.join(RESULTS_DIR, `${origin.id}.json`);
      let computed = false;
      let cellCount: number | null = null;
      try {
        await fs.access(filePath);
        computed = true;
        // Don't parse full JSON just for cell count — use manifest if available,
        // otherwise leave as null (cell count is informational only)
        cellCount = remoteMap.get(origin.id) ?? null;
      } catch {
        // Local file not found — check remote manifest
        if (remoteMap.has(origin.id)) {
          computed = true;
          cellCount = remoteMap.get(origin.id) ?? null;
        }
      }
      return {
        ...origin,
        computed,
        cellCount,
      };
    })
  );

  const total = origins.length;
  const completed = origins.filter((o) => o.computed).length;

  return NextResponse.json({ origins, total, completed });
}
