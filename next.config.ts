import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["geotiff", "traveltime-api", "h3-js"],
};

export default nextConfig;
