"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Controls from "@/components/Controls";
import Results from "@/components/Results";
import RingTable from "@/components/RingTable";
import { usePopulation } from "@/hooks/usePopulation";
import type { ColorBy } from "@/lib/circle-geojson";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
      Loading map...
    </div>
  ),
});

export default function Home() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [colorBy, setColorBy] = useState<ColorBy>("inverse-square");

  const { result, loading, error } = usePopulation({ lat, lng, radiusKm });

  const handleLocationSelect = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Map */}
      <div className="flex-1 relative">
        <Map
          onLocationSelect={handleLocationSelect}
          selectedLat={lat}
          selectedLng={lng}
          radiusKm={radiusKm}
          result={result}
          colorBy={colorBy}
        />
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Pop Squared</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Click anywhere on the map to calculate population
          </p>
        </div>

        <div className="p-5 border-b border-gray-100">
          <Controls
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            colorBy={colorBy}
            onColorByChange={setColorBy}
          />
        </div>

        <div className="p-5 border-b border-gray-100">
          <Results result={result} loading={loading} error={error} />
        </div>

        {result && result.rings.length > 0 && (
          <div className="p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-2">
              Ring Breakdown
            </h2>
            <RingTable rings={result.rings} />
          </div>
        )}

        <div className="mt-auto p-4 text-xs text-gray-400 border-t border-gray-100">
          Data: GHSL GHS-POP R2023A (JRC)
        </div>
      </div>
    </div>
  );
}
