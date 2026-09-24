import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Repair MIS · ระบบแจ้งซ่อม",
    short_name: "แจ้งซ่อม",
    description: "แจ้งซ่อม ติดตามงาน และรับการแจ้งเตือนงานซ่อมบำรุง",
    lang: "th",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon for these.
    shortcuts: [
      { name: "แจ้งซ่อมใหม่", url: "/requests/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "การแจ้งเตือน", url: "/notifications", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
