import { notFound } from "next/navigation";
import ComputeDashboard from "@/components/ComputeDashboard";

export const metadata = {
  title: "Compute — Pop Squared",
  description: "Batch compute travel-time data for fixed origins",
};

export default function ComputePage() {
  if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
    notFound();
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Compute Travel Times</h1>
          <p className="text-sm text-gray-500 mt-1">
            Batch compute travel-time data for all origins using the TravelTime API.
            Results are saved to disk and can be explored on the Explore page.
          </p>
        </div>
        <ComputeDashboard />
      </div>
    </div>
  );
}
