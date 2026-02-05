"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import TravelTimeExplorer from "@/components/TravelTimeExplorer";
import { useTravelTimeData } from "@/hooks/useTravelTimeData";
import type { TransportMode, TravelTimeCell } from "@/lib/travel-time-types";

interface OriginInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "city" | "airport";
  country: string;
  computed: boolean;
}

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

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

function buildSuperCells(
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

export default function ExplorePage() {
  const [origins, setOrigins] = useState<OriginInfo[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [mode, setMode] = useState<TransportMode>("fastest");
  const [exponent, setExponent] = useState(1);
  const [maxTimeMin, setMaxTimeMin] = useState(120);
  const [colorBy, setColorBy] = useState<"travel-time" | "weight">("travel-time");
  const [originsError, setOriginsError] = useState<string | null>(null);

  const { data, loading, error, results } = useTravelTimeData(
    selectedOrigin,
    mode,
    exponent,
    maxTimeMin
  );

  // Load origins list
  useEffect(() => {
    fetch("/api/travel-time/origins")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load origins (HTTP ${r.status})`);
        return r.json();
      })
      .then((d) => {
        setOrigins(d.origins);
        setOriginsError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setOriginsError(err instanceof Error ? err.message : "Failed to load origins");
      });
  }, []);

  // Map refs
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-0.1, 51.5],
      zoom: 7,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-left");

    map.on("load", () => {
      map.addSource("cells", { type: "geojson", data: EMPTY_FC });

      // Cell fill layer - banded color by travel time (default)
      map.addLayer({
        id: "cells-fill",
        type: "fill",
        source: "cells",
        paint: {
          "fill-color": [
            "step",
            ["get", "travelTimeMin"],
            "#15803d",  // 0-15 min: green-700
            15, "#22c55e",  // 15-30: green-500
            30, "#eab308",  // 30-45: yellow-500
            45, "#f59e0b",  // 45-60: amber-500
            60, "#f97316",  // 60-90: orange-500
            90, "#ef4444",  // 90-120: red-500
            120, "#991b1b", // 120-180: red-800
          ],
          "fill-opacity": 0.7,
        },
      });

      map.addLayer({
        id: "cells-outline",
        type: "line",
        source: "cells",
        paint: {
          "line-color": "rgba(0, 0, 0, 0.08)",
          "line-width": 0.5,
        },
        minzoom: 10,
      });

      // Overview layer: all computed origins as points
      map.addSource("origins-points", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "origins-circles",
        type: "circle",
        source: "origins-points",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            3, 4,
            8, 8,
          ],
          "circle-color": [
            "match", ["get", "type"],
            "airport", "#8b5cf6",
            "#1d4ed8",
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "white",
        },
      });
      map.addLayer({
        id: "origins-labels",
        type: "symbol",
        source: "origins-points",
        layout: {
          "text-field": [
            "concat",
            ["match", ["get", "type"], "airport", "\u2708 ", "\u{1F3D9} "],
            ["get", "name"],
          ],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#374151",
          "text-halo-color": "white",
          "text-halo-width": 1.5,
        },
      });

      // Click on origin point to select it
      map.on("click", "origins-circles", (e) => {
        const feature = e.features?.[0];
        if (feature?.properties?.id) {
          setSelectedOrigin(feature.properties.id);
        }
      });
      map.on("mouseenter", "origins-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "origins-circles", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      setMapReady(false);
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build GeoJSON for origins overview (when no origin selected)
  const originsGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    const computed = origins.filter((o) => o.computed);
    if (computed.length === 0) return EMPTY_FC;
    return {
      type: "FeatureCollection",
      features: computed.map((o) => ({
        type: "Feature" as const,
        properties: { id: o.id, name: o.name, type: o.type },
        geometry: {
          type: "Point" as const,
          coordinates: [o.lng, o.lat],
        },
      })),
    };
  }, [origins]);

  // Show/hide origins overview vs cell data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const originsSource = map.getSource("origins-points") as mapboxgl.GeoJSONSource;
    if (!originsSource) return;

    if (selectedOrigin) {
      // Hide overview, show cells
      originsSource.setData(EMPTY_FC);
      map.setLayoutProperty("origins-circles", "visibility", "none");
      map.setLayoutProperty("origins-labels", "visibility", "none");
    } else {
      // Show overview, clear cells
      originsSource.setData(originsGeoJson);
      map.setLayoutProperty("origins-circles", "visibility", "visible");
      map.setLayoutProperty("origins-labels", "visibility", "visible");
      markerRef.current?.remove();
      // Also clear cells when deselecting
      const cellsSource = map.getSource("cells") as mapboxgl.GeoJSONSource;
      if (cellsSource) cellsSource.setData(EMPTY_FC);
    }
  }, [selectedOrigin, originsGeoJson, mapReady]);

  // Build downsampled GeoJSON from results for map display
  const geoJson = useMemo((): GeoJSON.FeatureCollection => {
    if (!results || results.cells.length === 0) return EMPTY_FC;
    return buildSuperCells(results.cells);
  }, [results]);

  // Update map cells
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource("cells") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geoJson);
    }
  }, [geoJson, mapReady]);

  // Compute max weight for normalizing weight color bands
  const maxWeight = useMemo(() => {
    if (!results || results.cells.length === 0) return 1;
    let mw = 0;
    for (const c of results.cells) {
      if (c.weight > mw) mw = c.weight;
    }
    return mw || 1;
  }, [results]);

  // Update color scheme based on colorBy
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (colorBy === "travel-time") {
      map.setPaintProperty("cells-fill", "fill-color", [
        "step",
        ["get", "travelTimeMin"],
        "#15803d",  // 0-15 min
        15, "#22c55e",
        30, "#eab308",
        45, "#f59e0b",
        60, "#f97316",
        90, "#ef4444",
        120, "#991b1b",
      ]);
    } else {
      // Weight mode: band by fraction of max weight in supercell
      const w20 = maxWeight * 0.2;
      const w40 = maxWeight * 0.4;
      const w60 = maxWeight * 0.6;
      const w80 = maxWeight * 0.8;
      map.setPaintProperty("cells-fill", "fill-color", [
        "step",
        ["get", "weight"],
        "#fef9c3",    // lowest
        w20, "#fde68a",
        w40, "#fbbf24",
        w60, "#f97316",
        w80, "#dc2626",
      ]);
    }
  }, [colorBy, mapReady, maxWeight]);

  // Fly to origin when selected — show a prominent pulsing marker with label
  useEffect(() => {
    if (!data || !mapRef.current) return;

    markerRef.current?.remove();

    const el = document.createElement("div");
    el.className = "origin-marker";
    el.innerHTML = `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center">
        <div style="
          background:#1d4ed8;color:white;font-size:12px;font-weight:600;
          padding:3px 8px;border-radius:6px;white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);margin-bottom:4px;
        ">${data.origin.name}</div>
        <div style="
          width:16px;height:16px;border-radius:50%;
          background:#1d4ed8;border:3px solid white;
          box-shadow:0 0 0 3px #1d4ed8, 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      </div>
    `;

    const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([data.origin.lng, data.origin.lat])
      .addTo(mapRef.current);
    markerRef.current = marker;

    mapRef.current.flyTo({
      center: [data.origin.lng, data.origin.lat],
      zoom: 8,
      duration: 1200,
    });
  }, [data]);

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Travel-Time Explorer</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Explore precomputed travel-time weighted population
          </p>
        </div>

        <div className="p-5 flex-1">
          {originsError ? (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-2">
              <p className="text-sm font-medium text-red-800">Unable to load travel-time data</p>
              <p className="text-xs text-red-600">{originsError}</p>
              <p className="text-xs text-gray-500">
                Make sure precomputed data is available locally or via the <code className="bg-gray-100 px-1 rounded">TRAVEL_TIME_URL</code> environment variable.
              </p>
            </div>
          ) : (
            <TravelTimeExplorer
              origins={origins}
              selectedOrigin={selectedOrigin}
              onOriginChange={setSelectedOrigin}
              mode={mode}
              onModeChange={setMode}
              exponent={exponent}
              onExponentChange={setExponent}
              maxTimeMin={maxTimeMin}
              onMaxTimeChange={setMaxTimeMin}
              colorBy={colorBy}
              onColorByChange={setColorBy}
              results={results}
              loading={loading}
              error={error}
            />
          )}
        </div>

        <div className="mt-auto p-4 text-xs text-gray-400 border-t border-gray-100 space-y-1">
          <p>Hard edge at 180 min = TravelTime API 3-hour max.</p>
          <p>Data: GHSL GHS-POP R2023A (JRC) + TravelTime API</p>
        </div>
      </div>
    </div>
  );
}
