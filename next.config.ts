import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: let phones on the local network (private IP ranges) use the dev
  // server's assets and hot reload, so photos can be tested on a real device.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  experimental: {
    // Repair photos are posted to server actions. Vercel caps request bodies at
    // 4.5 MB, so use the same ceiling locally; the photo picker compresses each
    // photo to fit (see components/photo-picker.tsx).
    serverActions: { bodySizeLimit: "4.5mb" },
    proxyClientMaxBodySize: "4.5mb",
  },
};

export default nextConfig;
