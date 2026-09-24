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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      {
        // Always fetch the newest service worker; it may only load our own scripts.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
