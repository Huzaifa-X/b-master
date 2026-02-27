import type { NextConfig } from "next";

const nextConfig = {
  // Disable TypeScript and ESLint checks during build to prevent memory issues
  // Run type checks separately with `tsc --noEmit` in CI/dev
  typescript: {
    ignoreBuildErrors: true,
  },
  // Experimental features configuration
  experimental: {
    // Server Actions body size limit
    // NOTE: Supports large media uploads (videos up to 500MB for newsfeed)
    serverActions: {
      bodySizeLimit: '500mb', // Support large video uploads for newsfeed
    },
  },
  // Images configuration to prevent aggressive preloading
  images: {
    unoptimized: process.env.NODE_ENV === 'development', // Disable optimization in dev to reduce preloading
  },
  // Headers for WebContainer support (enables SharedArrayBuffer)
  // Required for @webcontainer/api to function properly
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp',
        },
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
      ],
    },
  ],
} satisfies NextConfig;

export default nextConfig;
