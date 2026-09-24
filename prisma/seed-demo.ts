/**
 * Optional demo data: ~80 historical repair requests over the last 120 days so the
 * admin dashboard and maintenance queue have something to show.
 *
 *   npm run db:seed:demo            # add demo data (run `npm run db:seed` first)
 *   npm run db:seed:demo -- --clean # remove everything this script created
 *
 * Demo accounts use the @demo.local domain (password: demo1234); every request
 * they reported is removed by --clean. Because that password is public, adding
 * demo data to a non-local database needs an explicit --allow-remote.
 */
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Priority, RequestStatus } from "../src/generated/prisma/enums";
import { isLocalDatabase, seedConnectionString } from "./seed-utils";

const connectionString = seedConnectionString();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEMO_DOMAIN = "@demo.local";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Small deterministic PRNG so every run produces the same data set.
let seed = 20260923;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
}
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
function weighted<T>(entries: readonly [T, number][]) {
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) if ((r -= w) < 0) return value;
  return entries[entries.length - 1][0];
}

const PROBLEMS: Record<string, { equipment: string; description: string }[]> = {
  "ไฟฟ้า / แสงสว่าง": [
    { equipment: "หลอดไฟ LED ฝ้าเพดาน", description: "หลอดไฟดับ 3 ดวง ห้องมืดมาก" },
    { equipment: "ปลั๊กไฟผนัง", description: "เสียบปลั๊กแล้วไม่มีไฟ มีรอยไหม้เล็กน้อย" },
    { equipment: "สวิตช์ไฟ", description: "กดสวิตช์แล้วไฟไม่ติด" },
  ],
  "ประปา / สุขภัณฑ์": [
    { equipment: "ก๊อกน้ำอ่างล้างมือ", description: "ก๊อกปิดไม่สนิท น้ำหยดตลอดเวลา" },
    { equipment: "ชักโครก", description: "กดชักโครกแล้วน้ำไม่ลง" },
    { equipment: "ท่อน้ำทิ้ง", description: "ท่อน้ำทิ้งอุดตัน มีกลิ่นเหม็น" },
  ],
  เครื่องปรับอากาศ: [
    { equipment: "เครื่องปรับอากาศ 24000 BTU", description: "เปิดแล้วไม่เย็น มีแต่ลมออก" },
    { equipment: "เครื่องปรับอากาศ 18000 BTU", description: "มีน้ำหยดจากตัวเครื่องภายในห้อง" },
    { equipment: "รีโมทแอร์", description: "รีโมทกดไม่ติด เปลี่ยนถ่านแล้ว" },
  ],
  "คอมพิวเตอร์ / เครือข่าย": [
    { equipment: "คอมพิวเตอร์ประจำห้อง", description: "เปิดเครื่องไม่ติด ไฟไม่เข้า" },
    { equipment: "จุดกระจายสัญญาณ Wi-Fi", description: "ต่อ Wi-Fi ได้แต่ใช้งานอินเทอร์เน็ตไม่ได้" },
    { equipment: "เครื่องพิมพ์", description: "กระดาษติดบ่อย พิมพ์ออกมาเป็นเส้น" },
  ],
  โสตทัศนูปกรณ์: [
    { equipment: "โปรเจคเตอร์", description: "ภาพไม่ขึ้น ไฟสถานะกะพริบสีแดง" },
    { equipment: "ไมโครโฟนไร้สาย", description: "เสียงขาดเป็นช่วงๆ" },
    { equipment: "ลำโพงห้องประชุม", description: "มีเสียงจี่ตลอดเวลา" },
  ],
  เฟอร์นิเจอร์: [
    { equipment: "เก้าอี้เลคเชอร์", description: "ขาเก้าอี้หัก นั่งไม่ได้ 4 ตัว" },
    { equipment: "ประตูห้อง", description: "ลูกบิดประตูหลวม ล็อกไม่ได้" },
  ],
  "อาคาร / โครงสร้าง": [
    { equipment: "ฝ้าเพดาน", description: "ฝ้ามีรอยรั่วซึมเวลาฝนตก" },
    { equipment: "กระเบื้องพื้น", description: "กระเบื้องแตกยกตัว เสี่ยงสะดุดล้ม" },
  ],
  อื่นๆ: [{ equipment: "ป้ายบอกทาง", description: "ป้ายหลุดห้อยลงมา" }],
};

const NOTES: Partial<Record<RequestStatus, string[]>> = {
  IN_PROGRESS: ["เข้าตรวจสอบหน้างานแล้ว กำลังดำเนินการ", "กำลังเปลี่ยนอะไหล่", "ตรวจสอบพบสาเหตุแล้ว กำลังแก้ไข"],
  ON_HOLD: ["รออะไหล่จากผู้จำหน่าย 3-5 วัน", "รอผู้รับเหมาเข้าดำเนินการ"],
  COMPLETED: ["ซ่อมเสร็จ ทดสอบใช้งานได้ปกติ", "เปลี่ยนอะไหล่ใหม่เรียบร้อย", "ทำความสะอาดและปรับตั้งใหม่ ใช้งานได้ปกติ"],
  REJECTED: ["อยู่นอกความรับผิดชอบของงานอาคาร ส่งเรื่องต่อฝ่ายไอที", "อุปกรณ์หมดอายุการใช้งาน ต้องจัดซื้อใหม่"],
};
const FEEDBACK = ["ช่างมาเร็ว บริการดีมาก", "ซ่อมเรียบร้อยดี", "ใช้เวลานานไปหน่อย", "ประทับใจครับ", ""];

async function clean() {
  const demoUsers = await prisma.user.findMany({ where: { email: { endsWith: DEMO_DOMAIN } }, select: { id: true } });
  const ids = demoUsers.map((u) => u.id);
  const requests = await prisma.repairRequest.deleteMany({ where: { reporterId: { in: ids } } });
  // Unassign any real request a demo technician still holds, then drop their records.
  await prisma.repairRequest.updateMany({ where: { assigneeId: { in: ids } }, data: { assigneeId: null } });
  await prisma.requestActivity.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.repairImage.deleteMany({ where: { uploadedById: { in: ids } } });
  const users = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`Removed ${requests.count} demo requests and ${users.count} demo users.`);
}

async function main() {
  if (process.argv.includes("--clean")) return clean();

  if (!isLocalDatabase(connectionString) && !process.argv.includes("--allow-remote")) {
    throw new Error(
      "Refusing to add demo accounts (password demo1234) to a non-local database.\n" +
        "Anyone could sign in with them. Re-run with --allow-remote if that is really what you want.",
    );
  }

  if (await prisma.user.count({ where: { email: { endsWith: DEMO_DOMAIN } } })) {
    console.log("Demo data already exists. Run with --clean first to recreate it.");
    return;
  }
  const [buildings, categories] = await Promise.all([prisma.building.findMany(), prisma.category.findMany()]);
  if (!buildings.length || !categories.length) throw new Error("Run `npm run db:seed` first.");

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const mkUser = (name: string, email: string, role: "USER" | "MAINTENANCE", department: string) =>
    prisma.user.create({ data: { name, email, role, department, passwordHash } });

  const technicians = await Promise.all([
    mkUser("ช่างประเสริฐ ไฟแรง", `tech.prasert${DEMO_DOMAIN}`, "MAINTENANCE", "งานอาคารสถานที่"),
    mkUser("ช่างอำนาจ ช่างไฟ", `tech.amnat${DEMO_DOMAIN}`, "MAINTENANCE", "งานอาคารสถานที่"),
  ]);
  const reporters = await Promise.all([
    mkUser("อ.สมศรี ใจงาม", `somsri${DEMO_DOMAIN}`, "USER", "คณะบริหารธุรกิจ"),
    mkUser("นายธนา เรียนดี", `thana${DEMO_DOMAIN}`, "USER", "คณะวิทยาศาสตร์"),
    mkUser("นางสาวพิมพ์ใจ รักงาน", `pimjai${DEMO_DOMAIN}`, "USER", "กองกลาง"),
    mkUser("อ.วิทยา ขยันสอน", `wittaya${DEMO_DOMAIN}`, "USER", "คณะวิศวกรรมศาสตร์"),
  ]);

  const now = Date.now();
  const seqByMonth = new Map<string, number>();
  async function codeFor(createdAt: Date) {
    const ym = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" })
      .format(createdAt)
      .replace("-", "");
    if (!seqByMonth.has(ym)) {
      const last = await prisma.repairRequest.findFirst({
        where: { code: { startsWith: `RP-${ym}-` } },
        orderBy: { code: "desc" },
        select: { code: true },
      });
      seqByMonth.set(ym, last ? Number(last.code.slice(-4)) : 0);
    }
    const seq = seqByMonth.get(ym)! + 1;
    seqByMonth.set(ym, seq);
    return `RP-${ym}-${String(seq).padStart(4, "0")}`;
  }

  // Oldest first so running numbers follow the timeline within each month.
  const createdTimes = Array.from({ length: 80 }, () => now - rand() * 120 * DAY).sort((a, b) => a - b);

  for (const created of createdTimes) {
    const ageDays = (now - created) / DAY;
    const category = pick(categories);
    const problem = pick(PROBLEMS[category.name] ?? PROBLEMS["อื่นๆ"]);
    const reporter = pick(reporters);
    const technician = pick(technicians);
    const priority = weighted<Priority>([["LOW", 2], ["MEDIUM", 5], ["HIGH", 2], ["URGENT", 1]]);

    // Older requests are almost always closed; recent ones are still in the pipeline.
    const status: RequestStatus =
      ageDays > 10
        ? weighted([["COMPLETED", 85], ["REJECTED", 6], ["CANCELLED", 5], ["ON_HOLD", 4]])
        : weighted([["PENDING", 30], ["ACCEPTED", 15], ["IN_PROGRESS", 25], ["ON_HOLD", 8], ["COMPLETED", 20], ["CANCELLED", 2]]);

    // Walk the workflow to build a believable activity history.
    const path: RequestStatus[] =
      status === "PENDING" || status === "CANCELLED"
        ? []
        : status === "REJECTED"
          ? ["REJECTED"]
          : status === "ACCEPTED"
            ? ["ACCEPTED"]
            : status === "IN_PROGRESS"
              ? ["ACCEPTED", "IN_PROGRESS"]
              : status === "ON_HOLD"
                ? ["ACCEPTED", "IN_PROGRESS", "ON_HOLD"]
                : rand() < 0.2
                  ? ["ACCEPTED", "IN_PROGRESS", "ON_HOLD", "IN_PROGRESS", "COMPLETED"]
                  : ["ACCEPTED", "IN_PROGRESS", "COMPLETED"];

    const urgencyFactor = { URGENT: 0.3, HIGH: 0.6, MEDIUM: 1, LOW: 1.5 }[priority];
    let t = created;
    const activities: {
      type: "CREATED" | "STATUS_CHANGED" | "RATED";
      fromStatus?: RequestStatus;
      toStatus?: RequestStatus;
      message?: string;
      createdAt: Date;
      actorId: string;
    }[] = [{ type: "CREATED", toStatus: "PENDING", createdAt: new Date(t), actorId: reporter.id }];

    let prev: RequestStatus = "PENDING";
    for (const next of path) {
      const gapHours = next === "ACCEPTED" ? 0.5 + rand() * 6 : next === "ON_HOLD" ? 2 + rand() * 12 : 2 + rand() * 30;
      t = Math.min(now - HOUR, t + gapHours * urgencyFactor * HOUR);
      activities.push({
        type: "STATUS_CHANGED",
        fromStatus: prev,
        toStatus: next,
        message: next === "ACCEPTED" ? `ช่างผู้รับผิดชอบ: ${technician.name}` : NOTES[next] ? pick(NOTES[next]!) : undefined,
        createdAt: new Date(t),
        actorId: technician.id,
      });
      prev = next;
    }
    if (status === "CANCELLED") {
      t = Math.min(now - HOUR, t + (1 + rand() * 5) * HOUR);
      activities.push({
        type: "STATUS_CHANGED",
        fromStatus: "PENDING",
        toStatus: "CANCELLED",
        message: "เหตุผล: แจ้งซ้ำ",
        createdAt: new Date(t),
        actorId: reporter.id,
      });
    }

    const completedAt = status === "COMPLETED" ? new Date(t) : null;
    const rating = status === "COMPLETED" && rand() < 0.75 ? weighted([[5, 5], [4, 4], [3, 1.5], [2, 0.5]]) : null;
    const feedback = rating ? pick(FEEDBACK) || null : null;
    if (rating) {
      activities.push({
        type: "RATED",
        message: `${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)${feedback ? `\n${feedback}` : ""}`,
        createdAt: new Date(Math.min(now - 60_000, t + rand() * DAY)),
        actorId: reporter.id,
      });
    }

    await prisma.repairRequest.create({
      data: {
        code: await codeFor(new Date(created)),
        equipment: problem.equipment,
        description: problem.description,
        location: `ห้อง ${Math.floor(1 + rand() * 5)}${String(Math.floor(1 + rand() * 12)).padStart(2, "0")}`,
        floor: Math.floor(1 + rand() * 5),
        priority,
        status,
        rating,
        feedback,
        createdAt: new Date(created),
        updatedAt: new Date(t),
        completedAt,
        buildingId: pick(buildings).id,
        categoryId: category.id,
        reporterId: reporter.id,
        assigneeId: path.length && status !== "REJECTED" ? technician.id : null,
        activities: { create: activities },
      },
    });
  }
  console.log(`Created ${createdTimes.length} demo requests, ${technicians.length} technicians, ${reporters.length} reporters.`);
  console.log(`Demo accounts: *${DEMO_DOMAIN} / demo1234`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
