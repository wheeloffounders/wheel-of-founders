import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Expose Vercel env to client so we can show test notification button on preview
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
  },
  // Cache control headers: production uses must-revalidate; dev uses no-cache
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: isProd
              ? "public, max-age=0, must-revalidate"
              : "no-cache, no-store, must-revalidate",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
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
  async rewrites() {
    return [
      // URL stays on `/morning/free` / `/emergency/free` so freemium audit paths work while GLOBAL_BETA_OVERRIDE is true.
      { source: "/morning/free", destination: "/morning" },
      { source: "/emergency/free", destination: "/emergency" },
    ];
  },
  async redirects() {
    return [
      {
        source: "/signup",
        destination: "/auth/signup",
        permanent: false,
      },
      {
        source: "/admin/analytics/cross-user",
        destination: "/admin/cross-user-analytics",
        permanent: false,
      },
      {
        source: "/beta",
        destination: "/auth/login",
        permanent: false,
      },
      // Blogger → App Router: EOS blueprint post (migration)
      {
        source: "/2026/01/build-your-business-like-pro-eos.html",
        destination: "/blog/eos-blueprint-founders",
        permanent: true,
      },
      // Blogger → App Router: mission drift post (migration)
      {
        source: "/2026/01/the-simple-system-to-stop-mission-drift.html",
        destination: "/blog/stop-mission-drift",
        permanent: true,
      },
      // Blogger → App Router: founder dilemma post (migration)
      {
        source: "/2026/01/the-founders-dilemma.html",
        destination: "/blog/founders-dilemma-hollow-success",
        permanent: true,
      },
      // Blogger → App Router: decision closure post (migration)
      {
        source: "/2026/01/stop-second-guessing.html",
        destination: "/blog/stop-second-guessing",
        permanent: true,
      },
      // Blogger → App Router: smart constraints post (migration)
      {
        source: "/2026/01/smart-constraints.html",
        destination: "/blog/smart-constraints-to-do-lists",
        permanent: true,
      },
      // Blogger → App Router: motivation discipline post (migration)
      {
        source: "/2026/01/motivation-is-a-lie.html",
        destination: "/blog/motivation-is-a-lie",
        permanent: true,
      },
      // Blogger → App Router: vision bridge post (migration)
      {
        source: "/2026/01/vision-bridge.html",
        destination: "/blog/vision-to-execution-bridge",
        permanent: true,
      },
      // Blogger → App Router: delegation fear post (migration)
      {
        source: "/2026/02/blog-post.html",
        destination: "/blog/founder-delegation-fear",
        permanent: true,
      },
      // Blogger → App Router: 7 PM crash post (migration)
      {
        source: "/2026/02/blog-post_02.html",
        destination: "/blog/brain-quits-at-7pm",
        permanent: true,
      },
      // Blogger → App Router: solo founder system post (migration)
      {
        source: "/2026/02/blog-post_04.html",
        destination: "/blog/solo-founder-operating-system",
        permanent: true,
      },
      // Blogger → App Router: burnout types post (migration)
      {
        source: "/2026/02/blog-post_05.html",
        destination: "/blog/founder-burnout-types",
        permanent: true,
      },
      // Blogger → App Router: legacy anxiety post (migration)
      {
        source: "/2026/02/blog-post_06.html",
        destination: "/blog/founder-legacy-anxiety",
        permanent: true,
      },
      // Blogger → App Router: founder guilt post (migration)
      {
        source: "/2026/02/blog-post_11.html",
        destination: "/blog/female-founder-guilt-hitting-pause",
        permanent: true,
      },
      // Blogger → App Router: success hangover post (migration)
      {
        source: "/2026/02/blog-post_451.html",
        destination: "/blog/success-hangover-founder",
        permanent: true,
      },
      // Blogger → App Router: founder fog post (migration)
      {
        source: "/2026/02/founders-fog-analysis-paralysis.html",
        destination: "/blog/founders-fog-decision-clarity",
        permanent: true,
      },
      // Blogger → App Router: Mrs. Deer origin post (migration)
      {
        source: "/2026/03/founder-productivity-system-motherhood-lessons.html",
        destination: "/blog/why-i-built-mrs-deer",
        permanent: true,
      },
      // Blogger → App Router: burnout warning signs post (migration)
      {
        source: "/2026/03/i-tracked-my-energy-for-30-dayshere-are.html",
        destination: "/blog/founder-burnout-warning-signs",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "wheel-of-founders",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
