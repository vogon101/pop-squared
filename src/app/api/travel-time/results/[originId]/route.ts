import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const RESULTS_DIR = path.join(process.cwd(), "data", "travel-time");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ originId: string }> }
) {
  const { originId } = await params;

  if (!originId || typeof originId !== "string") {
    return NextResponse.json({ error: "originId is required" }, { status: 400 });
  }

  // Sanitize to prevent path traversal
  const safe = originId.replace(/[^a-z0-9-]/g, "");
  if (safe !== originId) {
    return NextResponse.json({ error: "Invalid originId" }, { status: 400 });
  }

  const remoteBase = process.env.TRAVEL_TIME_URL;

  // Try local file first
  try {
    const raw = await fs.readFile(path.join(RESULTS_DIR, `${safe}.json`), "utf-8");
    return new NextResponse(raw, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    // Local file not found — try remote if configured
  }

  if (remoteBase) {
    const url = `${remoteBase}/${safe}.json`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.text();
        return new NextResponse(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    } catch {
      // Remote fetch failed
    }
  }

  return NextResponse.json(
    { error: `No results found for origin: ${originId}` },
    { status: 404 }
  );
}
