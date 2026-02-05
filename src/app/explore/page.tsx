"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

// Pixel size for 30-arcsecond grid
const PIXEL_SIZE_DEG = 1 / 120;

function cellToFeature(
  cell: TravelTimeCell & { time: number; weight: number },
  maxWeight: number,
  maxTimeSec: number
): GeoJSON.Feature {
  const half = PIXEL_SIZE_DEG / 2;
  const normalizedTime = Math.min(cell.time / maxTimeSec, 1);
  const normalizedWeight = maxWeight > 0 ? cell.weight / maxWeight : 0;

  return {
    type: "Feature",
    properties: {
      travelTime: cell.time,
      travelTimeMin: Math.round(cell.time / 60),
      weight: cell.weight,
      normalizedTime,
      normalizedWeight,
      pop: cell.pop,
    },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [cell.lng - half, cell.lat - half],
        [cell.lng + half, cell.lat - half],
        [cell.lng + half, cell.lat + half],
        [cell.lng - half, cell.lat + half],
        [cell.lng - half, cell.lat - half],
      ]],
    },
  };
}

export default function ExplorePage() {
  const [origins, setOrigins] = useState<OriginInfo[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [mode, setMode] = useState<TransportMode>("fastest");
  const [exponent, setExponent] = useState(1);
  const [maxTimeMin, setMaxTimeMin] = useState(120);
  const [colorBy, setColorBy] = useState<"travel-time" | "weight">("travel-time");

  const { data, loading, error, results } = useTravelTimeData(
    selectedOrigin,
    mode,
    exponent,
    maxTimeMin
  );

  // Load origins list
  useEffect(() => {
    fetch("/api/travel-time/origins")
      .then((r) => r.json())
      .then((d) => setOrigins(d.origins))
      .catch(console.error);
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

      // Cell fill layer - color by travel time (default)
      map.addLayer({
        id: "cells-fill",
        type: "fill",
        source: "cells",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "normalizedTime"],
            0, "#22c55e",   // green-500
            0.25, "#eab308", // yellow-500
            0.5, "#f97316",  // orange-500
            0.75, "#ef4444", // red-500
            1.0, "#7f1d1d",  // red-900
          ],
          "fill-opacity": 0.6,
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

  // Build GeoJSON from results
  const geoJson = useMemo((): GeoJSON.FeatureCollection => {
    if (!results || results.cells.length === 0) return EMPTY_FC;

    let maxWeight = 0;
    for (const c of results.cells) {
      if (c.weight > maxWeight) maxWeight = c.weight;
    }
    const maxTimeSec = maxTimeMin * 60;

    return {
      type: "FeatureCollection",
      features: results.cells.map((c) => cellToFeature(c, maxWeight, maxTimeSec)),
    };
  }, [results, maxTimeMin]);

  // Update map cells
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource("cells") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geoJson);
    }
  }, [geoJson, mapReady]);

  // Update color scheme based on colorBy
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (colorBy === "travel-time") {
      map.setPaintProperty("cells-fill", "fill-color", [
        "interpolate",
        ["linear"],
        ["get", "normalizedTime"],
        0, "#22c55e",
        0.25, "#eab308",
        0.5, "#f97316",
        0.75, "#ef4444",
        1.0, "#7f1d1d",
      ]);
    } else {
      map.setPaintProperty("cells-fill", "fill-color", [
        "interpolate",
        ["linear"],
        ["get", "normalizedWeight"],
        0, "#fef9c3",
        0.3, "#fbbf24",
        0.6, "#f97316",
        1.0, "#dc2626",
      ]);
    }
  }, [colorBy, mapReady]);

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
        </div>

        <div className="mt-auto p-4 text-xs text-gray-400 border-t border-gray-100">
          Data: GHSL GHS-POP R2023A (JRC) + TravelTime API
        </div>
      </div>
    </div>
  );
}
