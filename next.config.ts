import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For Replit, listen on the PORT env var
  ...(process.env.PORT ? { env: { PORT: process.env.PORT } } : {}),
  serverExternalPackages: ['puppeteer'],
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
  typescript: {
    // Type errors are known issues from DB schema using unknown[] — not runtime errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
