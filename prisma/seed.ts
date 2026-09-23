import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

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

const users = [
  { name: "ผู้ดูแลระบบ", email: "admin@repair.local", role: "ADMIN" as const, password: "admin1234" },
  { name: "ช่างสมชาย ใจดี", email: "tech@repair.local", role: "MAINTENANCE" as const, password: "tech1234" },
  { name: "ผู้ใช้ทั่วไป", email: "user@repair.local", role: "USER" as const, password: "user1234" },
];

async function main() {
  for (const b of buildings) {
    await prisma.building.upsert({ where: { name: b.name }, update: {}, create: b });
  }
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, role: u.role, passwordHash },
    });
  }
  console.log("Seed completed.");
  console.table(users.map(({ email, password, role }) => ({ email, password, role })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
