"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@/lib/circle-geojson";

interface MapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLat: number | null;
  selectedLng: number | null;
  radiusKm: number;
}

export default function Map({
  onLocationSelect,
  selectedLat,
  selectedLng,
  radiusKm,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-0.1, 51.5], // London default
      zoom: 9,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-left");

    map.on("load", () => {
      // Add circle source and layer
      map.addSource("circle", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "circle-fill",
        type: "fill",
        source: "circle",
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.15,
        },
      });

      map.addLayer({
        id: "circle-outline",
        type: "line",
        source: "circle",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
        },
      });
    });

    map.on("click", (e) => {
      onLocationSelect(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker and circle when selection/radius changes
  const updateOverlay = useCallback(() => {
    const map = mapRef.current;
    if (!map || selectedLat === null || selectedLng === null) return;

    // Update or create marker
    if (markerRef.current) {
      markerRef.current.setLngLat([selectedLng, selectedLat]);
    } else {
      markerRef.current = new mapboxgl.Marker({ color: "#2563eb" })
        .setLngLat([selectedLng, selectedLat])
        .addTo(map);
    }

    // Update circle overlay
    const source = map.getSource("circle") as mapboxgl.GeoJSONSource;
    if (source) {
      const circleGeoJSON = turf.createCircle(
        selectedLng,
        selectedLat,
        radiusKm
      );
      source.setData(circleGeoJSON);
    }
  }, [selectedLat, selectedLng, radiusKm]);

  useEffect(() => {
    updateOverlay();
  }, [updateOverlay]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}
