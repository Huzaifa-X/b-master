import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable TypeScript and ESLint checks during build to prevent memory issues
  // Run type checks separately with `tsc --noEmit` in CI/dev
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Experimental features configuration
  experimental: {
    // Server Actions body size limit
    // NOTE: With pre-upload architecture, this is now a safety measure only
    // Files and images are uploaded to S3 before being sent to Server Actions
    serverActions: {
      bodySizeLimit: '5mb', // Increased from default 1MB to 5MB as safety buffer
    },
  },
  // Images configuration to prevent aggressive preloading
  images: {
    unoptimized: process.env.NODE_ENV === 'development', // Disable optimization in dev to reduce preloading
  },
};

export default nextConfig;
