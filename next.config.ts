import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: let phones on the local network (private IP ranges) use the dev
  // server's assets and hot reload, so photos can be tested on a real device.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  experimental: {
    // Repair photos are posted to server actions; photos are downscaled in the
    // browser first, this is headroom for up to 5 images.
    serverActions: { bodySizeLimit: "30mb" },
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
