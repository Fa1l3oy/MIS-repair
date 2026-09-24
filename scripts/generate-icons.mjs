// Renders the app icons (favicon, home-screen, notification badge) from one SVG.
// Run after changing the brand mark:  node scripts/generate-icons.mjs
// Uses sharp, which Next.js installs for image optimisation.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

// lucide "wrench", the same glyph as the in-app brand mark
const WRENCH =
  "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z";

/** glyph = share of the canvas the 24px icon box takes up */
function svg({ size, rounded = false, glyph, background = true }) {
  const box = size * glyph;
  const offset = (size - box) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  ${background ? `<rect width="${size}" height="${size}" rx="${rounded ? size * 0.25 : 0}" fill="url(#g)"/>` : ""}
  <g transform="translate(${offset} ${offset}) scale(${box / 24})" fill="none" stroke="#fff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
    <path d="${WRENCH}"/>
  </g>
</svg>
`;
}

const png = (file, options) => sharp(Buffer.from(svg(options))).png().toFile(file);

await mkdir("public/icons", { recursive: true });
await Promise.all([
  // Browser tab
  writeFile("src/app/icon.svg", svg({ size: 64, rounded: true, glyph: 0.56 })),
  // Home screen / install dialog ("any" purpose keeps the rounded corners)
  png("public/icons/icon-192.png", { size: 192, rounded: true, glyph: 0.56 }),
  png("public/icons/icon-512.png", { size: 512, rounded: true, glyph: 0.56 }),
  // Android adaptive icon: full bleed, glyph inside the 80% safe zone
  png("public/icons/maskable-512.png", { size: 512, glyph: 0.44 }),
  // iOS rounds the corners itself
  png("src/app/apple-icon.png", { size: 180, glyph: 0.5 }),
  // Android status-bar badge: only the alpha channel is used
  png("public/icons/badge-96.png", { size: 96, glyph: 0.8, background: false }),
]);
console.log("Icons written.");
