import "server-only";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"; // no look-alikes (0/O, 1/l/I)

/** Short, unguessable id for a QR sticker, e.g. "k7Qm2xPa". */
export function newQrId(length = 8) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** QR code as an SVG data URI (crisp at any print size). */
export async function qrDataUri(text: string) {
  const svg = await QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#18181b", light: "#ffffff" },
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Public origin for links printed in QR codes. A configured NEXTAUTH_URL wins
 * (self-hosted production), so a Host header can't change what gets printed;
 * otherwise the current request's origin (Vercel, proxies, a LAN IP in dev).
 */
export async function requestOrigin() {
  if (process.env.NEXTAUTH_URL) {
    try {
      return new URL(process.env.NEXTAUTH_URL).origin;
    } catch {
      // malformed: fall back to the request
    }
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function isLoopbackOrigin(origin: string) {
  const host = new URL(origin).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}
