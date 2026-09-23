import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrate, seed, studio) needs a direct connection: migrations take
    // advisory locks, which a transaction pooler such as Neon's PgBouncer does not
    // support. Neon's Vercel integration provides it as DATABASE_URL_UNPOOLED; the
    // app itself keeps using the pooled DATABASE_URL (src/lib/prisma.ts).
    url: process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"],
  },
});
