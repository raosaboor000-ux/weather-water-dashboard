import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["googleapis"],
  outputFileTracingIncludes: {
    "/api/water-levels/route": ["./data/dams_data_new.csv"],
    "/api/water-levels/upload/route": ["./data/dams_data_new.csv"],
  },
};

export default nextConfig;
