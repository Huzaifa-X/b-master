import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce preloading warnings in development
  experimental: {
    optimizePackageImports: ['@assistant-ui/react', '@assistant-ui/react-ai-sdk'],
  },
  // Images configuration to prevent aggressive preloading
  images: {
    unoptimized: process.env.NODE_ENV === 'development', // Disable optimization in dev to reduce preloading
  },
};

export default nextConfig;
