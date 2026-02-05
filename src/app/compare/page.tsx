"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import CompareSidebar from "@/components/compare/CompareSidebar";
import type { CompareMode } from "@/components/compare/ModePicker";
import { usePopulation } from "@/hooks/usePopulation";
import { useTravelTimeData } from "@/hooks/useTravelTimeData";
import { buildSuperCells } from "@/lib/supercells";
import { createRings, createCircle } from "@/lib/circle-geojson";
import type { TransportMode } from "@/lib/travel-time-types";

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

export default function ComparePage() {
  // -- Mode --
  const [compareMode, setCompareMode] = useState<CompareMode>("distance");

  // -- Distance state --
  const [latA, setLatA] = useState<number | null>(null);
  const [lngA, setLngA] = useState<number | null>(null);
  const [latB, setLatB] = useState<number | null>(null);
  const [lngB, setLngB] = useState<number | null>(null);
  const [activePin, setActivePin] = useState<"A" | "B">("A");
  const [radiusKm, setRadiusKm] = useState(10);
  const [exponentDist, setExponentDist] = useState(2);

  // -- Time state --
  const [originA, setOriginA] = useState<string | null>(null);
  const [originB, setOriginB] = useState<string | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>("fastest");
  const [exponentTime, setExponentTime] = useState(1);
  const [maxTimeMin, setMaxTimeMin] = useState(120);
  const [origins, setOrigins] = useState<OriginInfo[]>([]);

  // -- Hooks: Distance --
  const distA = usePopulation({
    lat: compareMode === "distance" ? latA : null,
    lng: compareMode === "distance" ? lngA : null,
    radiusKm,
    exponent: exponentDist,
  });
  const distB = usePopulation({
    lat: compareMode === "distance" ? latB : null,
    lng: compareMode === "distance" ? lngB : null,
    radiusKm,
    exponent: exponentDist,
  });

  // -- Hooks: Time --
  const timeA = useTravelTimeData(
    compareMode === "time" ? originA : null,
    transportMode,
    exponentTime,
    maxTimeMin
  );
  const timeB = useTravelTimeData(
    compareMode === "time" ? originB : null,
    transportMode,
    exponentTime,
    maxTimeMin
  );

  // -- Load origins for time mode --
  useEffect(() => {
    fetch("/api/travel-time/origins")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setOrigins(d.origins))
      .catch(() => {});
  }, []);

  // -- Map refs --
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markerARef = useRef<mapboxgl.Marker | null>(null);
  const markerBRef = useRef<mapboxgl.Marker | null>(null);
  const activePinRef = useRef(activePin);

  // Sync ref
  useEffect(() => {
    activePinRef.current = activePin;
  }, [activePin]);

  // -- Initialize map --
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
      // -- Distance sources & layers --
      map.addSource("rings-a", { type: "geojson", data: EMPTY_FC });
      map.addSource("circle-a", { type: "geojson", data: EMPTY_FC });
      map.addSource("rings-b", { type: "geojson", data: EMPTY_FC });
      map.addSource("circle-b", { type: "geojson", data: EMPTY_FC });

      // A rings fill (blue palette)
      map.addLayer({
        id: "rings-a-fill",
        type: "fill",
        source: "rings-a",
        paint: {
          "fill-color": [
            "interpolate", ["linear"], ["get", "intensity"],
            0, "#dbeafe",
            1, "#1e3a8a",
          ],
          "fill-opacity": 0.55,
        },
      });
      map.addLayer({
        id: "rings-a-outline",
        type: "line",
        source: "rings-a",
        paint: { "line-color": "#1e40af", "line-width": 0.5, "line-opacity": 0.4 },
      });
      map.addLayer({
        id: "circle-a-outline",
        type: "line",
        source: "circle-a",
        paint: { "line-color": "#1e40af", "line-width": 2 },
      });

      // B rings fill (orange palette)
      map.addLayer({
        id: "rings-b-fill",
        type: "fill",
        source: "rings-b",
        paint: {
          "fill-color": [
            "interpolate", ["linear"], ["get", "intensity"],
            0, "#ffedd5",
            1, "#7c2d12",
          ],
          "fill-opacity": 0.55,
        },
      });
      map.addLayer({
        id: "rings-b-outline",
        type: "line",
        source: "rings-b",
        paint: { "line-color": "#c2410c", "line-width": 0.5, "line-opacity": 0.4 },
      });
      map.addLayer({
        id: "circle-b-outline",
        type: "line",
        source: "circle-b",
        paint: { "line-color": "#c2410c", "line-width": 2 },
      });

      // -- Time sources & layers --
      map.addSource("cells-a", { type: "geojson", data: EMPTY_FC });
      map.addSource("cells-b", { type: "geojson", data: EMPTY_FC });

      map.addLayer({
        id: "cells-a-fill",
        type: "fill",
        source: "cells-a",
        paint: {
          "fill-color": [
            "step",
            ["get", "travelTimeMin"],
            "#1e3a8a",
            15, "#1e40af",
            30, "#2563eb",
            45, "#3b82f6",
            60, "#60a5fa",
            90, "#93c5fd",
            120, "#dbeafe",
          ],
          "fill-opacity": 0.5,
        },
      });
      map.addLayer({
        id: "cells-b-fill",
        type: "fill",
        source: "cells-b",
        paint: {
          "fill-color": [
            "step",
            ["get", "travelTimeMin"],
            "#7c2d12",
            15, "#9a3412",
            30, "#c2410c",
            45, "#ea580c",
            60, "#f97316",
            90, "#fdba74",
            120, "#ffedd5",
          ],
          "fill-opacity": 0.5,
        },
      });

      // Origins overlay for time mode
      map.addSource("origins-points", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "origins-circles",
        type: "circle",
        source: "origins-points",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 8],
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

      // Click on origin
      map.on("click", "origins-circles", (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties?.id) return;
        const id = feature.properties.id;
        // Fill whichever origin slot is empty, or replace A
        if (!originARef.current) {
          setOriginA(id);
        } else if (!originBRef.current) {
          setOriginB(id);
        } else {
          setOriginA(id);
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

    // Distance mode click handler
    map.on("click", (e) => {
      // Skip if we clicked on an origin point in time mode
      const features = map.queryRenderedFeatures(e.point, { layers: ["origins-circles"] });
      if (features.length > 0) return;

      if (compareModeRef.current !== "distance") return;
      const { lat, lng } = e.lngLat;
      if (activePinRef.current === "A") {
        setLatA(lat);
        setLngA(lng);
        setActivePin("B");
      } else {
        setLatB(lat);
        setLngB(lng);
        setActivePin("A");
      }
    });

    mapRef.current = map;

    return () => {
      setMapReady(false);
      markerARef.current?.remove();
      markerBRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refs for values used in map click handler
  const compareModeRef = useRef(compareMode);
  useEffect(() => {
    compareModeRef.current = compareMode;
  }, [compareMode]);

  const originARef = useRef(originA);
  useEffect(() => {
    originARef.current = originA;
  }, [originA]);

  const originBRef = useRef(originB);
  useEffect(() => {
    originBRef.current = originB;
  }, [originB]);

  // -- Visibility management: toggle distance vs time layers --
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const distLayers = [
      "rings-a-fill", "rings-a-outline", "circle-a-outline",
      "rings-b-fill", "rings-b-outline", "circle-b-outline",
    ];
    const timeLayers = [
      "cells-a-fill", "cells-b-fill",
      "origins-circles", "origins-labels",
    ];

    const isDistance = compareMode === "distance";
    for (const id of distLayers) {
      map.setLayoutProperty(id, "visibility", isDistance ? "visible" : "none");
    }
    for (const id of timeLayers) {
      map.setLayoutProperty(id, "visibility", isDistance ? "none" : "visible");
    }
  }, [compareMode, mapReady]);

  // -- Distance: update A ring/circle layers --
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const ringsSource = map.getSource("rings-a") as mapboxgl.GeoJSONSource;
    const circleSource = map.getSource("circle-a") as mapboxgl.GeoJSONSource;
    if (!ringsSource || !circleSource) return;

    if (distA.result && latA !== null && lngA !== null) {
      const ringsGeo = createRings(lngA, latA, distA.result.rings);
      const circleGeo: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [createCircle(lngA, latA, radiusKm)],
      };
      ringsSource.setData(ringsGeo);
      circleSource.setData(circleGeo);
    } else {
      ringsSource.setData(EMPTY_FC);
      circleSource.setData(EMPTY_FC);
    }
  }, [distA.result, latA, lngA, radiusKm, mapReady]);

  // -- Distance: update B ring/circle layers --
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const ringsSource = map.getSource("rings-b") as mapboxgl.GeoJSONSource;
    const circleSource = map.getSource("circle-b") as mapboxgl.GeoJSONSource;
    if (!ringsSource || !circleSource) return;

    if (distB.result && latB !== null && lngB !== null) {
      const ringsGeo = createRings(lngB, latB, distB.result.rings);
      const circleGeo: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [createCircle(lngB, latB, radiusKm)],
      };
      ringsSource.setData(ringsGeo);
      circleSource.setData(circleGeo);
    } else {
      ringsSource.setData(EMPTY_FC);
      circleSource.setData(EMPTY_FC);
    }
  }, [distB.result, latB, lngB, radiusKm, mapReady]);

  // -- Distance: markers --
  const updateMarker = useCallback(
    (
      ref: React.MutableRefObject<mapboxgl.Marker | null>,
      lat: number | null,
      lng: number | null,
      label: string,
      bgColor: string,
      borderColor: string
    ) => {
      ref.current?.remove();
      if (lat === null || lng === null || !mapRef.current) return;

      const el = document.createElement("div");
      el.innerHTML = `<div style="
        width:24px;height:24px;border-radius:50%;
        background:${bgColor};border:3px solid white;
        box-shadow:0 0 0 2px ${borderColor}, 0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:11px;font-weight:700;
      ">${label}</div>`;

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
      ref.current = marker;
    },
    []
  );

  useEffect(() => {
    if (compareMode !== "distance") return;
    updateMarker(markerARef, latA, lngA, "A", "#1e40af", "#1e40af");
  }, [latA, lngA, compareMode, updateMarker]);

  useEffect(() => {
    if (compareMode !== "distance") return;
    updateMarker(markerBRef, latB, lngB, "B", "#c2410c", "#c2410c");
  }, [latB, lngB, compareMode, updateMarker]);

  // -- Time: markers for origins --
  useEffect(() => {
    if (compareMode !== "time") {
      markerARef.current?.remove();
      markerARef.current = null;
      return;
    }
    if (!timeA.data) {
      markerARef.current?.remove();
      markerARef.current = null;
      return;
    }
    const { lat, lng, name } = timeA.data.origin;
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="
          background:#1e40af;color:white;font-size:11px;font-weight:600;
          padding:2px 6px;border-radius:5px;white-space:nowrap;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);margin-bottom:3px;
        ">${name}</div>
        <div style="
          width:14px;height:14px;border-radius:50%;
          background:#1e40af;border:3px solid white;
          box-shadow:0 0 0 2px #1e40af, 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      </div>`;
    markerARef.current?.remove();
    if (mapRef.current) {
      markerARef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    }
  }, [timeA.data, compareMode]);

  useEffect(() => {
    if (compareMode !== "time") {
      markerBRef.current?.remove();
      markerBRef.current = null;
      return;
    }
    if (!timeB.data) {
      markerBRef.current?.remove();
      markerBRef.current = null;
      return;
    }
    const { lat, lng, name } = timeB.data.origin;
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="
          background:#c2410c;color:white;font-size:11px;font-weight:600;
          padding:2px 6px;border-radius:5px;white-space:nowrap;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);margin-bottom:3px;
        ">${name}</div>
        <div style="
          width:14px;height:14px;border-radius:50%;
          background:#c2410c;border:3px solid white;
          box-shadow:0 0 0 2px #c2410c, 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      </div>`;
    markerBRef.current?.remove();
    if (mapRef.current) {
      markerBRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    }
  }, [timeB.data, compareMode]);

  // -- Time: update supercell layers --
  const cellsAGeo = useMemo((): GeoJSON.FeatureCollection => {
    if (!timeA.results || timeA.results.cells.length === 0) return EMPTY_FC;
    return buildSuperCells(timeA.results.cells);
  }, [timeA.results]);

  const cellsBGeo = useMemo((): GeoJSON.FeatureCollection => {
    if (!timeB.results || timeB.results.cells.length === 0) return EMPTY_FC;
    return buildSuperCells(timeB.results.cells);
  }, [timeB.results]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("cells-a") as mapboxgl.GeoJSONSource;
    if (src) src.setData(cellsAGeo);
  }, [cellsAGeo, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("cells-b") as mapboxgl.GeoJSONSource;
    if (src) src.setData(cellsBGeo);
  }, [cellsBGeo, mapReady]);

  // -- Time: origins overlay --
  const originsGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    const computed = origins.filter((o) => o.computed);
    if (computed.length === 0) return EMPTY_FC;
    return {
      type: "FeatureCollection",
      features: computed.map((o) => ({
        type: "Feature" as const,
        properties: { id: o.id, name: o.name, type: o.type },
        geometry: { type: "Point" as const, coordinates: [o.lng, o.lat] },
      })),
    };
  }, [origins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("origins-points") as mapboxgl.GeoJSONSource;
    if (src) src.setData(originsGeoJson);
  }, [originsGeoJson, mapReady]);

  // -- Fit bounds when both points are set --
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (compareMode === "distance") {
      if (latA !== null && lngA !== null && latB !== null && lngB !== null) {
        map.fitBounds(
          [[Math.min(lngA, lngB), Math.min(latA, latB)], [Math.max(lngA, lngB), Math.max(latA, latB)]],
          { padding: 80, maxZoom: 12, duration: 800 }
        );
      }
    } else {
      if (timeA.data && timeB.data) {
        const aO = timeA.data.origin;
        const bO = timeB.data.origin;
        map.fitBounds(
          [[Math.min(aO.lng, bO.lng), Math.min(aO.lat, bO.lat)], [Math.max(aO.lng, bO.lng), Math.max(aO.lat, bO.lat)]],
          { padding: 80, maxZoom: 8, duration: 800 }
        );
      } else if (timeA.data) {
        map.flyTo({ center: [timeA.data.origin.lng, timeA.data.origin.lat], zoom: 8, duration: 800 });
      } else if (timeB.data) {
        map.flyTo({ center: [timeB.data.origin.lng, timeB.data.origin.lat], zoom: 8, duration: 800 });
      }
    }
  }, [compareMode, latA, lngA, latB, lngB, timeA.data, timeB.data, mapReady]);

  // -- Clear markers on mode switch --
  useEffect(() => {
    markerARef.current?.remove();
    markerARef.current = null;
    markerBRef.current?.remove();
    markerBRef.current = null;
  }, [compareMode]);

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-[520px] bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col overflow-y-auto">
        <CompareSidebar
          compareMode={compareMode}
          onCompareModeChange={setCompareMode}
          activePin={activePin}
          onActivePinChange={setActivePin}
          latA={latA}
          lngA={lngA}
          latB={latB}
          lngB={lngB}
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
          exponentDist={exponentDist}
          onExponentDistChange={setExponentDist}
          distResultA={distA.result}
          distResultB={distB.result}
          distLoadingA={distA.loading}
          distLoadingB={distB.loading}
          distErrorA={distA.error}
          distErrorB={distB.error}
          origins={origins}
          originA={originA}
          onOriginAChange={setOriginA}
          originB={originB}
          onOriginBChange={setOriginB}
          transportMode={transportMode}
          onTransportModeChange={setTransportMode}
          exponentTime={exponentTime}
          onExponentTimeChange={setExponentTime}
          maxTimeMin={maxTimeMin}
          onMaxTimeChange={setMaxTimeMin}
          timeResultsA={timeA.results}
          timeResultsB={timeB.results}
          timeLoadingA={timeA.loading}
          timeLoadingB={timeB.loading}
          timeErrorA={timeA.error}
          timeErrorB={timeB.error}
        />
      </div>
    </div>
  );
}
