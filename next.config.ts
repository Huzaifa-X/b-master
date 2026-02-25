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
    // NOTE: Supports large document uploads (up to 50MB for PDF processing)
    serverActions: {
      bodySizeLimit: '50mb', // Support large PDFs for Upstage extraction
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
