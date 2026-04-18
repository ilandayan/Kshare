import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Redirects pour les onglets admin fusionnés + alias d'URL avec accent
  async redirects() {
    return [
      { source: "/kshare-admin/reporting", destination: "/kshare-admin", permanent: true },
      { source: "/shop/statistiques", destination: "/shop/dashboard", permanent: true },
      // Alias avec accent / anciens chemins → redirection 301 permanente
      { source: "/confidentialit%C3%A9", destination: "/confidentialite", permanent: true },
      { source: "/confidentialité", destination: "/confidentialite", permanent: true },
      { source: "/politique-confidentialite", destination: "/confidentialite", permanent: true },
      { source: "/politique-de-confidentialite", destination: "/confidentialite", permanent: true },
      { source: "/privacy", destination: "/confidentialite", permanent: true },
      { source: "/mentions-legales", destination: "/cgu", permanent: true },
    ];
  },
  // Headers de securite
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "kshare",

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
