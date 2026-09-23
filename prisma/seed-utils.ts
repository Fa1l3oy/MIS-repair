import "dotenv/config";

/** Direct connection when available (Neon's DATABASE_URL_UNPOOLED), like prisma.config.ts. */
export function seedConnectionString() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL; // empty counts as unset
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

/** True when the database runs on this machine (e.g. the docker compose container). */
export function isLocalDatabase(url: string) {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  return ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host);
}
