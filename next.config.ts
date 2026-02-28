import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache control headers: production uses must-revalidate; dev uses no-cache
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: isProd
              ? "public, max-age=0, must-revalidate"
              : "no-cache, no-store, must-revalidate",
          },
        ],
      },
      // Static assets: immutable in production for long-term caching
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: isProd
              ? "public, max-age=31536000, immutable"
              : "no-cache, no-store",
          },
        ],
      },
    ];
  },
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
