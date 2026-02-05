"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { createCircle, createRings } from "@/lib/circle-geojson";
import type { ColorBy } from "@/lib/circle-geojson";
import type { PopulationResult } from "@/lib/types";

interface MapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLat: number | null;
  selectedLng: number | null;
  radiusKm: number;
  result: PopulationResult | null;
  colorBy: ColorBy;
}

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export default function Map({
  onLocationSelect,
  selectedLat,
  selectedLng,
  radiusKm,
  result,
  colorBy,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-0.1, 51.5],
      zoom: 9,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-left");

    map.on("load", () => {
      // Ring fills (colored by intensity)
      map.addSource("rings", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "rings-fill",
        type: "fill",
        source: "rings",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "intensity"],
            0, "#fef9c3",   // yellow-100
            0.3, "#fbbf24", // amber-400
            0.6, "#f97316", // orange-500
            1.0, "#dc2626", // red-600
          ],
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["get", "intensity"],
            0, 0.15,
            1, 0.55,
          ],
        },
      });
      map.addLayer({
        id: "rings-outline",
        type: "line",
        source: "rings",
        paint: {
          "line-color": [
            "interpolate",
            ["linear"],
            ["get", "intensity"],
            0, "#fbbf24",
            0.5, "#f97316",
            1.0, "#dc2626",
          ],
          "line-width": 1,
          "line-opacity": 0.5,
        },
      });

      // Outer circle border (always blue, shown while loading or as fallback)
      map.addSource("circle", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "circle-outline",
        type: "line",
        source: "circle",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
        },
      });

      readyRef.current = true;
    });

    map.on("click", (e) => {
      onLocationSelect(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker, circle outline, and ring fills
  const updateOverlay = useCallback(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (selectedLat === null || selectedLng === null) return;

    // Outer circle border
    const circleSource = map.getSource("circle") as mapboxgl.GeoJSONSource;
    if (circleSource) {
      circleSource.setData(createCircle(selectedLng, selectedLat, radiusKm));
    }

    // Ring fills
    const ringsSource = map.getSource("rings") as mapboxgl.GeoJSONSource;
    if (ringsSource) {
      if (result && result.rings.length > 0) {
        const ringsGeoJSON = createRings(selectedLng, selectedLat, result.rings, colorBy);
        ringsSource.setData(ringsGeoJSON);
      } else {
        ringsSource.setData(EMPTY_FC);
      }
    }
  }, [selectedLat, selectedLng, radiusKm, result, colorBy]);

  useEffect(() => {
    updateOverlay();
  }, [updateOverlay]);

  return <div ref={containerRef} className="w-full h-full" />;
}
