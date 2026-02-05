"use client";

interface ControlsProps {
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
}

export default function Controls({
  radiusKm,
  onRadiusChange,
}: ControlsProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Radius: {radiusKm} km
      </label>
      <input
        type="range"
        min={3}
        max={50}
        step={1}
        value={radiusKm}
        onChange={(e) => onRadiusChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>3 km</span>
        <span>50 km</span>
      </div>
    </div>
  );
}
