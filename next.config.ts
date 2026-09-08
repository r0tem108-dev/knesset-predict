import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "mongodb-memory-server"],
  // ESLint is not wired up in this starter; type-checking still runs on build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
