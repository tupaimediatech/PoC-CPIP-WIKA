import type { NextConfig } from "next";

const LARAVEL_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${LARAVEL_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

