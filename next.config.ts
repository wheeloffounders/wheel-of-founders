import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/admin/analytics/cross-user",
        destination: "/admin/cross-user-analytics",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
