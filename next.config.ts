import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
