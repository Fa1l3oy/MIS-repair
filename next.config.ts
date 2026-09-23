import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Repair photos are posted to server actions; photos are downscaled in the
    // browser first, this is headroom for up to 5 images.
    serverActions: { bodySizeLimit: "30mb" },
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
