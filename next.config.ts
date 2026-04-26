/* eslint-disable @typescript-eslint/no-explicit-any */
// next-dev-toolbar — optional dev dep (safely skipped if not installed)
/* eslint-disable @typescript-eslint/no-require-imports */
let _devWrap: (c: any) => any = (c: any) => c;
try { _devWrap = require('next-dev-toolbar/plugin').withDevToolbar(); } catch {}


import type { NextConfig } from "next";

function getAllowedOrigins() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  let configuredHost: string | null = null;

  if (configuredBaseUrl) {
    try {
      configuredHost = new URL(configuredBaseUrl).hostname;
    } catch {
      configuredHost = null;
    }
  }

  return Array.from(
    new Set([
      "localhost",
      "127.0.0.1",
      "*.devtunnels.ms",
      "*.*.devtunnels.ms",
      "*.ngrok-free.app",
      "*.ngrok-free.dev",
      ...(configuredHost ? [configuredHost] : []),
    ]),
  );
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedOrigins(),
  experimental: {
    serverActions: {
      allowedOrigins: getAllowedOrigins(),
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
} as NextConfig;

export default _devWrap(nextConfig);
