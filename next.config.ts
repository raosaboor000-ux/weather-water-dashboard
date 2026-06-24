import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["googleapis"],
  outputFileTracingIncludes: {
    "/api/water-levels": ["./data/dams_data_new.csv"],
    "/api/water-levels/upload": ["./data/dams_data_new.csv"],
  },
};

export default nextConfig;
