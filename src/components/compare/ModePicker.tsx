"use client";

export type CompareMode = "distance" | "time";

interface ModePickerProps {
  mode: CompareMode;
  onChange: (mode: CompareMode) => void;
}

export default function ModePicker({ mode, onChange }: ModePickerProps) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {(["distance", "time"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            mode === m
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {m === "distance" ? "Distance" : "Travel Time"}
        </button>
      ))}
    </div>
  );
}
