import type { NextConfig } from "next";
import os from "os";

/** 폰에서 LAN IP로 접속할 때 dev JS/HMR이 차단되지 않도록 허용 */
function getLocalDevOrigins(): string[] {
  const origins = new Set(["localhost", "127.0.0.1"]);
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const net of entries ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        origins.add(net.address);
      }
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getLocalDevOrigins(),
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
