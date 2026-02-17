import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@vantage/page-builder': '../src',
    },
  },
};

export default nextConfig;
