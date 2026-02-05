import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { TravelTimeProtoClient } from "traveltime-api";
import { ORIGINS, getProtoCountry } from "@/lib/origins";
import { extractPopulatedCells } from "@/lib/travel-time-grid";
import type { OriginResult, TravelTimeCell } from "@/lib/travel-time-types";

const MAX_TRAVEL_TIME_SEC = 10800; // 3 hours
const SEARCH_RADIUS_KM = 200;
const RESULTS_DIR = path.join(process.cwd(), "data", "travel-time");

function getClient(): TravelTimeProtoClient {
  const appId = process.env.TRAVELTIME_APP_ID;
  const apiKey = process.env.TRAVELTIME_API_KEY;
  if (!appId || !apiKey) {
    throw new Error("TRAVELTIME_APP_ID and TRAVELTIME_API_KEY must be set in .env.local");
  }
  return new TravelTimeProtoClient(
    { apiKey, applicationId: appId },
    {
      rateLimitSettings: {
        enabled: true,
        hitsPerMinute: 60,
        retryCount: 3,
        timeBetweenRetries: 2000,
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originId } = body;

    if (!originId || typeof originId !== "string") {
      return NextResponse.json({ error: "originId is required" }, { status: 400 });
    }

    const origin = ORIGINS.find((o) => o.id === originId);
    if (!origin) {
      return NextResponse.json({ error: `Unknown origin: ${originId}` }, { status: 400 });
    }

    const protoCountry = getProtoCountry(origin.country);
    if (!protoCountry) {
      return NextResponse.json(
        { error: `Country ${origin.country} not supported by TravelTime proto API` },
        { status: 400 }
      );
    }

    // Extract populated cells from GeoTIFF
    const { cells: gridCells } = await extractPopulatedCells(
      origin.lat,
      origin.lng,
      SEARCH_RADIUS_KM
    );

    if (gridCells.length === 0) {
      return NextResponse.json(
        { error: "No populated cells found within search radius" },
        { status: 400 }
      );
    }

    const client = getClient();
    const coords = gridCells.map((c) => ({ lat: c.lat, lng: c.lng }));

    // Call TravelTime API for driving
    let drivingTimes: number[] = [];
    try {
      const drivingResult = await client.timeFilterFast({
        country: protoCountry as "uk",
        departureLocation: { lat: origin.lat, lng: origin.lng },
        destinationCoordinates: coords,
        transportation: "driving+ferry",
        travelTime: MAX_TRAVEL_TIME_SEC,
      });

      if ("error" in drivingResult) {
        throw new Error(`Driving API error: ${drivingResult.error.type}`);
      }
      drivingTimes = drivingResult.properties.travelTimes;
    } catch (err) {
      console.error(`Driving request failed for ${originId}:`, err);
      drivingTimes = new Array(gridCells.length).fill(-1);
    }

    // Call TravelTime API for public transit
    let transitTimes: number[] = [];
    try {
      const transitResult = await client.timeFilterFast({
        country: protoCountry as "uk",
        departureLocation: { lat: origin.lat, lng: origin.lng },
        destinationCoordinates: coords,
        transportation: "pt",
        travelTime: MAX_TRAVEL_TIME_SEC,
      });

      if ("error" in transitResult) {
        throw new Error(`Transit API error: ${transitResult.error.type}`);
      }
      transitTimes = transitResult.properties.travelTimes;
    } catch (err) {
      console.error(`Transit request failed for ${originId}:`, err);
      transitTimes = new Array(gridCells.length).fill(-1);
    }

    // Merge results
    const cells: TravelTimeCell[] = [];
    let drivingReachable = 0;
    let transitReachable = 0;

    for (let i = 0; i < gridCells.length; i++) {
      const driving = drivingTimes[i] >= 0 ? drivingTimes[i] : null;
      const transit = transitTimes[i] >= 0 ? transitTimes[i] : null;

      // Only include cells reachable by at least one mode
      if (driving !== null || transit !== null) {
        cells.push({
          lat: gridCells[i].lat,
          lng: gridCells[i].lng,
          pop: gridCells[i].pop,
          driving,
          transit,
        });
        if (driving !== null) drivingReachable++;
        if (transit !== null) transitReachable++;
      }
    }

    // Build result object
    const result: OriginResult = {
      origin: { id: origin.id, name: origin.name, lat: origin.lat, lng: origin.lng },
      computedAt: new Date().toISOString(),
      maxTravelTimeSec: MAX_TRAVEL_TIME_SEC,
      searchRadiusKm: SEARCH_RADIUS_KM,
      cells,
    };

    // Save to disk
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    const filePath = path.join(RESULTS_DIR, `${originId}.json`);
    await fs.writeFile(filePath, JSON.stringify(result));

    return NextResponse.json({
      success: true,
      cellCount: cells.length,
      totalGridCells: gridCells.length,
      drivingReachable,
      transitReachable,
    });
  } catch (err) {
    console.error("Compute error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
