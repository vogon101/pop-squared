import { NextRequest, NextResponse } from "next/server";
import { computePopulation } from "@/lib/population";
import type { PopulationQuery } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, radiusKm } = body as Partial<PopulationQuery>;

    if (typeof lat !== "number" || lat < -90 || lat > 90) {
      return NextResponse.json(
        { error: "lat must be a number between -90 and 90" },
        { status: 400 }
      );
    }
    if (typeof lng !== "number" || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "lng must be a number between -180 and 180" },
        { status: 400 }
      );
    }
    if (typeof radiusKm !== "number" || radiusKm < 1 || radiusKm > 500) {
      return NextResponse.json(
        { error: "radiusKm must be a number between 1 and 500" },
        { status: 400 }
      );
    }

    const result = await computePopulation({ lat, lng, radiusKm });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Population API error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
