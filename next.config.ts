import type { NextConfig } from "next";

// Local-dev-only API proxy. Makes every /api/v1/* request same-origin from
// the browser's point of view, which sidesteps two local-dev-only problems
// at once: CORS (no cross-origin request = nothing to configure) and the
// anon_session_id cookie the backend sets for logged-out ad-watch tracking
// (it's SameSite=None, which browsers require to be paired with Secure —
// and Secure cookies don't get sent over plain http://, so cross-port
// localhost cookies can silently fail to stick without this proxy).
//
// Gated on NODE_ENV === "development" so it's a no-op for `next build`
// (Vercel, the Docker image, and the AWS EC2 deployment all build with
// NODE_ENV=production) — those keep talking directly to whatever
// NEXT_PUBLIC_API_URL is set to in their own environment, untouched.
const DEV_BACKEND_URL = process.env.DEV_BACKEND_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${DEV_BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'commondatastorage.googleapis.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'pazzell-backend-storage-644724502006-eu-north-1-an.s3.eu-north-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
