/**
 * Seeds buildings, repair categories and accounts.
 *
 *   npm run db:seed        # local development: three test accounts with known passwords
 *   npm run db:seed:prod   # production: one admin with a random password (printed once)
 *     -- --admin-email=you@example.com   (or SEED_ADMIN_EMAIL) to choose the admin's email
 *
 * The development accounts have public passwords, so they are refused on any
 * database that isn't running on this machine.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { isLocalDatabase, seedConnectionString } from "./seed-utils";

const connectionString = seedConnectionString();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const production = process.argv.includes("--production");
const adminEmailArg = process.argv.find((a) => a.startsWith("--admin-email="))?.split("=")[1];

const buildings = [
  { name: "อาคารเรียนรวม 1", code: "B01" },
  { name: "อาคารเรียนรวม 2", code: "B02" },
  { name: "อาคารสำนักงานอธิการบดี", code: "B03" },
  { name: "อาคารหอสมุด", code: "B04" },
  { name: "หอพักนักศึกษา", code: "B05" },
];

const categories = [
  "ไฟฟ้า / แสงสว่าง",
  "ประปา / สุขภัณฑ์",
  "เครื่องปรับอากาศ",
  "คอมพิวเตอร์ / เครือข่าย",
  "โสตทัศนูปกรณ์",
  "เฟอร์นิเจอร์",
  "อาคาร / โครงสร้าง",
  "อื่นๆ",
];

const devUsers = [
  { name: "ผู้ดูแลระบบ", email: "admin@repair.local", role: "ADMIN" as const, password: "admin1234" },
  { name: "ช่างสมชาย ใจดี", email: "tech@repair.local", role: "MAINTENANCE" as const, password: "tech1234" },
  { name: "ผู้ใช้ทั่วไป", email: "user@repair.local", role: "USER" as const, password: "user1234" },
];

async function seedMasterData() {
  for (const b of buildings) {
    await prisma.building.upsert({ where: { name: b.name }, update: {}, create: b });
  }
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
}

async function seedDevUsers() {
  for (const u of devUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, role: u.role, passwordHash: await bcrypt.hash(u.password, 10) },
    });
  }
  console.log("Seed completed.");
  console.table(devUsers.map(({ email, password, role }) => ({ email, password, role })));
}

async function seedProductionAdmin() {
  const email = (adminEmailArg ?? process.env.SEED_ADMIN_EMAIL ?? "admin@repair.local").trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (existing) {
    console.log(`Seed completed. ${email} already exists (${existing.role}); its password was not changed.`);
    return;
  }
  const password = randomBytes(12).toString("base64url");
  await prisma.user.create({
    data: { name: "ผู้ดูแลระบบ", email, role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log("Seed completed. Admin account created — this password is shown only once:");
  console.table([{ email, password, role: "ADMIN" }]);
  console.log("Sign in, then change it on the profile page.");
}

async function main() {
  if (!production && !isLocalDatabase(connectionString)) {
    throw new Error(
      "Refusing to create the test accounts (admin1234, ...) on a non-local database.\n" +
        "Use `npm run db:seed:prod` there instead.",
    );
  }
  await seedMasterData();
  if (production) await seedProductionAdmin();
  else await seedDevUsers();
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
