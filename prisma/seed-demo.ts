/**
 * Demo data that makes the system look like it has been in real use for six
 * months: 8 buildings with real room layouts, ~30 staff/teacher/student
 * accounts, 5 technicians with their own specialities, ~180 repair requests
 * whose history follows the real workflow (accept → work → wait for parts →
 * done → rating), photos before/after repair, QR stickers, repeat faults at the
 * same spot, and notifications for the real technicians.
 *
 *   npm run db:seed:demo              # add demo data (run `npm run db:seed` first locally)
 *   npm run db:seed:demo -- --clean   # remove everything this script created
 *
 * Another database (e.g. production), with photos going to its Blob store:
 *   DATABASE_URL=… BLOB_READ_WRITE_TOKEN=… npx tsx prisma/seed-demo.ts --allow-remote
 *
 * Demo accounts use the @repairmis.ac.th domain (not a real domain). Locally
 * their password is demo1234; anywhere else each gets a random password that
 * is never shown — an admin can set one from จัดการผู้ใช้ if needed.
 */
import bcrypt from "bcryptjs";
import { del, put } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import type { ActivityType, Priority, RequestStatus } from "../src/generated/prisma/enums";
import { SLA_HOURS } from "../src/lib/sla";
import { renderPhoto, type Scene } from "./demo-photos";
import { isLocalDatabase, seedConnectionString } from "./seed-utils";

const connectionString = seedConnectionString();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEMO_DOMAIN = "@repairmis.ac.th";
const LEGACY_DEMO_DOMAIN = "@demo.local"; // earlier versions of this script
const QR_PREFIX = "Dm"; // demo QR stickers
const REQUEST_COUNT = 210;
const HISTORY_DAYS = 180;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const BLOB_PREFIX = "repair-photos/";
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// ---------- deterministic randomness --------------------------------------

let seed = 20260924;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
}
const between = (a: number, b: number) => a + rand() * (b - a);
const chance = (p: number) => rand() < p;
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
function weighted<T>(entries: readonly (readonly [T, number])[]) {
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) if ((r -= w) < 0) return value;
  return entries[entries.length - 1][0];
}
/** Log-normal factor with the given median (spread 0.55). */
const lognormal = (median: number) => {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return median * Math.exp(0.55 * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
};
const pad = (n: number, width = 2) => String(n).padStart(width, "0");
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
function hash(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619) >>> 0;
  return h;
}

// ---------- places --------------------------------------------------------

type SpotKind =
  | "classroom"
  | "complab"
  | "lab"
  | "meeting"
  | "office"
  | "library"
  | "dorm"
  | "toilet"
  | "corridor"
  | "canteen";

type BuildingDef = {
  name: string;
  code: string;
  floors: number;
  weight: number;
  spots: { kind: SpotKind; weight: number; names: (floor: number) => string[] }[];
};

const TOILETS = { kind: "toilet" as const, weight: 2, names: () => ["ห้องน้ำชาย", "ห้องน้ำหญิง"] };

const BUILDINGS: BuildingDef[] = [
  {
    name: "อาคารเรียนรวม 1",
    code: "B01",
    floors: 5,
    weight: 5,
    spots: [
      { kind: "classroom", weight: 6, names: (f) => range(1, 8).map((n) => `ห้อง ${f}${pad(n)}`) },
      TOILETS,
      { kind: "corridor", weight: 1, names: () => ["โถงหน้าลิฟต์", "ทางเดินหน้าห้องเรียน"] },
    ],
  },
  {
    name: "อาคารเรียนรวม 2",
    code: "B02",
    floors: 6,
    weight: 4,
    spots: [
      { kind: "classroom", weight: 5, names: (f) => range(1, 6).map((n) => `ห้อง ${f}${pad(n)}`) },
      { kind: "complab", weight: 3, names: (f) => (f === 3 || f === 4 ? [`ห้องปฏิบัติการคอมพิวเตอร์ ${f}07`, `ห้องปฏิบัติการคอมพิวเตอร์ ${f}08`] : []) },
      { kind: "meeting", weight: 1, names: (f) => (f === 6 ? ["ห้องประชุมใหญ่ 601"] : []) },
      TOILETS,
      { kind: "corridor", weight: 1, names: () => ["โถงหน้าลิฟต์", "ทางเดินหน้าห้องเรียน"] },
    ],
  },
  {
    name: "อาคารสำนักงานอธิการบดี",
    code: "B03",
    floors: 4,
    weight: 3,
    spots: [
      {
        kind: "office",
        weight: 4,
        names: (f) =>
          [
            ["งานสารบรรณ", "งานการเงินและบัญชี"],
            ["กองคลัง", "กองการเจ้าหน้าที่"],
            ["กองนโยบายและแผน", "ห้องรองอธิการบดี"],
            ["ห้องอธิการบดี", "ห้องเลขานุการผู้บริหาร"],
          ][f - 1],
      },
      { kind: "meeting", weight: 2, names: (f) => (f === 1 ? ["ห้องรับรอง"] : [`ห้องประชุม ${f}01`]) },
      TOILETS,
      { kind: "corridor", weight: 1, names: (f) => (f === 1 ? ["โถงต้อนรับ", "โถงหน้าลิฟต์"] : ["โถงหน้าลิฟต์"]) },
    ],
  },
  {
    name: "อาคารหอสมุด",
    code: "B04",
    floors: 3,
    weight: 2,
    spots: [
      {
        kind: "library",
        weight: 4,
        names: (f) =>
          [
            ["เคาน์เตอร์บริการยืม-คืน", "โซนอ่านหนังสือ 24 ชั่วโมง"],
            ["โซนอ่านหนังสือเงียบ", "ห้องค้นคว้ากลุ่ม 201", "ห้องค้นคว้ากลุ่ม 202"],
            ["ห้องค้นคว้ากลุ่ม 301", "โซนวารสารและหนังสือพิมพ์"],
          ][f - 1],
      },
      { kind: "complab", weight: 2, names: (f) => (f === 2 ? ["ห้องคอมพิวเตอร์สืบค้น"] : []) },
      TOILETS,
    ],
  },
  {
    name: "หอพักนักศึกษา",
    code: "B05",
    floors: 8,
    weight: 5,
    spots: [
      { kind: "dorm", weight: 7, names: (f) => range(1, 20).map((n) => `ห้อง ${f}${pad(n)}`) },
      { kind: "toilet", weight: 2, names: () => ["ห้องน้ำรวมฝั่งทิศเหนือ", "ห้องน้ำรวมฝั่งทิศใต้"] },
      { kind: "corridor", weight: 1, names: (f) => (f === 1 ? ["ห้องซักรีด", "โถงหน้าลิฟต์"] : ["ทางเดินหน้าห้องพัก", "โถงหน้าลิฟต์"]) },
    ],
  },
  {
    name: "อาคารปฏิบัติการวิทยาศาสตร์",
    code: "B06",
    floors: 4,
    weight: 2,
    spots: [
      { kind: "lab", weight: 4, names: (f) => [`ห้องปฏิบัติการเคมี ${f}01`, `ห้องปฏิบัติการชีววิทยา ${f}02`, `ห้องปฏิบัติการฟิสิกส์ ${f}03`] },
      { kind: "classroom", weight: 1, names: (f) => [`ห้องบรรยาย ${f}05`] },
      TOILETS,
    ],
  },
  {
    name: "อาคารคณะวิศวกรรมศาสตร์",
    code: "B07",
    floors: 5,
    weight: 3,
    spots: [
      { kind: "classroom", weight: 3, names: (f) => range(1, 4).map((n) => `ห้อง EN${f}${pad(n)}`) },
      { kind: "lab", weight: 2, names: (f) => (f === 1 ? ["โรงประลอง (Workshop)", "ห้องปฏิบัติการไฟฟ้ากำลัง"] : [`ห้องปฏิบัติการ EN${f}10`]) },
      { kind: "complab", weight: 1, names: (f) => (f === 3 ? ["ห้องปฏิบัติการคอมพิวเตอร์ EN311"] : []) },
      TOILETS,
      { kind: "corridor", weight: 1, names: () => ["ทางเดินหน้าห้องเรียน"] },
    ],
  },
  {
    name: "โรงอาหารกลาง",
    code: "B08",
    floors: 2,
    weight: 2,
    spots: [
      {
        kind: "canteen",
        weight: 4,
        names: (f) => (f === 1 ? ["โซนร้านค้า A", "โซนร้านค้า B", "จุดล้างภาชนะ", "โซนที่นั่งรับประทานอาหาร"] : ["ห้องประชุมชมรม", "โซนที่นั่งชั้นลอย"]),
      },
      TOILETS,
    ],
  },
];

const CATEGORIES = [
  "ไฟฟ้า / แสงสว่าง",
  "ประปา / สุขภัณฑ์",
  "เครื่องปรับอากาศ",
  "คอมพิวเตอร์ / เครือข่าย",
  "โสตทัศนูปกรณ์",
  "เฟอร์นิเจอร์",
  "อาคาร / โครงสร้าง",
  "อื่นๆ",
] as const;
type CategoryName = (typeof CATEGORIES)[number];

// ---------- faults ----------------------------------------------------------

type Problem = {
  category: CategoryName;
  equipment: string;
  scene: Scene;
  kinds: SpotKind[];
  /** Only spots whose name matches (e.g. lifts). */
  where?: RegExp;
  /** Government asset code prefix; each spot gets its own number. */
  asset?: string;
  weight: number;
  priority: [Priority, number][];
  descriptions: string[];
  progress: string[];
  fixes: string[];
  holds: string[];
};

const ROOMS: SpotKind[] = ["classroom", "complab", "lab", "meeting", "office", "library"];

const PROBLEMS: Problem[] = [
  {
    category: "เครื่องปรับอากาศ",
    equipment: "เครื่องปรับอากาศ 24,000 BTU",
    scene: "ac",
    kinds: ROOMS,
    asset: "4120-001",
    weight: 9,
    priority: [["MEDIUM", 4], ["HIGH", 5], ["URGENT", 1]],
    descriptions: [
      "เปิดแล้วไม่เย็น มีแต่ลมออก ช่วงบ่ายห้องร้อนมากจนเรียนไม่ได้",
      "แอร์มีน้ำหยดลงโต๊ะแถวหน้า ต้องเอาถังมารองไว้",
      "มีเสียงดังผิดปกติตอนคอมเพรสเซอร์ทำงาน",
      "เปิดได้สักพักแล้วตัดเอง ไฟหน้าเครื่องกะพริบ",
    ],
    progress: ["เข้าตรวจสอบแล้ว น้ำยาแอร์รั่ว กำลังหาจุดรั่ว", "กำลังล้างแผงคอยล์เย็นและถาดน้ำทิ้ง", "ตรวจพบคาปาซิเตอร์เสื่อม กำลังเปลี่ยน"],
    fixes: [
      "ล้างแผงคอยล์เย็น–คอยล์ร้อน และเติมน้ำยา R32 วัดลมออกได้ 12°C ใช้งานได้ปกติ",
      "ล้างท่อน้ำทิ้งที่อุดตันและปรับระดับตัวเครื่อง ไม่มีน้ำหยดแล้ว",
      "เปลี่ยนคาปาซิเตอร์คอมเพรสเซอร์ 35µF ทดสอบ 1 ชั่วโมง ทำงานปกติ",
      "เปลี่ยนเซนเซอร์อุณหภูมิคอยล์เย็น เครื่องไม่ตัดแล้ว",
    ],
    holds: ["รออะไหล่คาปาซิเตอร์จากผู้จำหน่าย 2–3 วัน", "รอผู้รับเหมาเข้าเติมน้ำยาและเชื่อมท่อ", "รอบอร์ดควบคุมจากศูนย์บริการ"],
  },
  {
    category: "เครื่องปรับอากาศ",
    equipment: "เครื่องปรับอากาศ 12,000 BTU",
    scene: "ac",
    kinds: ["dorm", "office"],
    asset: "4120-001",
    weight: 6,
    priority: [["LOW", 1], ["MEDIUM", 5], ["HIGH", 3]],
    descriptions: ["แอร์ไม่เย็น เปิดทั้งคืนอุณหภูมิไม่ลด", "รีโมทกดแล้วแอร์ไม่ตอบสนอง เปลี่ยนถ่านแล้ว", "น้ำแอร์หยดใส่เตียง"],
    progress: ["ตรวจสอบแล้ว แผงคอยล์สกปรกมาก กำลังล้าง", "กำลังตรวจแผงรับสัญญาณรีโมท"],
    fixes: ["ล้างแอร์ทั้งระบบและเติมน้ำยาเล็กน้อย เย็นปกติ", "เปลี่ยนแผงรับสัญญาณรีโมท ใช้งานได้ปกติ", "ล้างท่อน้ำทิ้งและเปลี่ยนถาดน้ำทิ้งที่แตก"],
    holds: ["รอแผงรับสัญญาณจากศูนย์บริการ"],
  },
  {
    category: "ไฟฟ้า / แสงสว่าง",
    equipment: "โคมไฟ LED ตะแกรงฝ้าเพดาน",
    scene: "light",
    kinds: [...ROOMS, "dorm", "corridor", "canteen"],
    weight: 9,
    priority: [["LOW", 3], ["MEDIUM", 5], ["HIGH", 1]],
    descriptions: ["หลอดไฟดับ 3 ดวงด้านหลังห้อง อ่านหนังสือไม่เห็น", "ไฟกะพริบตลอดเวลา ปวดตามาก", "ไฟดับทั้งแถวฝั่งหน้าต่าง"],
    progress: ["ตรวจสอบพบบัลลาสต์เสีย กำลังเปลี่ยน", "กำลังไล่ตรวจวงจรไฟแสงสว่าง"],
    fixes: ["เปลี่ยนหลอด LED T8 18W จำนวน 3 หลอด", "เปลี่ยนบัลลาสต์และหลอดใหม่ ไฟไม่กะพริบแล้ว", "เปลี่ยนเบรกเกอร์ย่อย 16A ที่ทริป ไฟติดครบทั้งแถว"],
    holds: ["รอหลอด LED จากงานพัสดุ"],
  },
  {
    category: "ไฟฟ้า / แสงสว่าง",
    equipment: "ปลั๊กไฟผนัง",
    scene: "socket",
    kinds: ["classroom", "complab", "office", "dorm", "library", "lab"],
    weight: 6,
    priority: [["MEDIUM", 3], ["HIGH", 4], ["URGENT", 2]],
    descriptions: ["เสียบปลั๊กแล้วไม่มีไฟ มีรอยไหม้ดำที่เต้ารับ มีกลิ่นไหม้", "ปลั๊กหลวม เสียบแล้วหลุด ชาร์จโน้ตบุ๊กไม่ได้", "มีประกายไฟตอนเสียบปลั๊ก"],
    progress: ["ตัดไฟวงจรนี้ไว้ก่อนแล้ว กำลังเปลี่ยนเต้ารับ"],
    fixes: ["เปลี่ยนเต้ารับคู่ใหม่และขันสายให้แน่น ตรวจวัดสายดินผ่าน", "เปลี่ยนเต้ารับและสายไฟช่วงที่ไหม้ยาว 2 เมตร"],
    holds: ["รอเต้ารับชนิดมีม่านนิรภัยจากงานพัสดุ"],
  },
  {
    category: "ไฟฟ้า / แสงสว่าง",
    equipment: "สวิตช์ไฟ",
    scene: "switch",
    kinds: ["classroom", "office", "dorm", "toilet", "corridor"],
    weight: 3,
    priority: [["LOW", 4], ["MEDIUM", 3]],
    descriptions: ["กดสวิตช์แล้วไฟไม่ติด", "สวิตช์แตก กดแล้วค้าง"],
    progress: ["กำลังเปลี่ยนสวิตช์"],
    fixes: ["เปลี่ยนสวิตช์ทางเดียว 2 ช่องใหม่ ใช้งานได้ปกติ"],
    holds: [],
  },
  {
    category: "ประปา / สุขภัณฑ์",
    equipment: "ก๊อกน้ำอ่างล้างมือ",
    scene: "faucet",
    kinds: ["toilet", "lab", "canteen", "dorm"],
    weight: 7,
    priority: [["LOW", 3], ["MEDIUM", 5], ["HIGH", 1]],
    descriptions: ["ก๊อกปิดไม่สนิท น้ำหยดตลอดเวลา", "ก๊อกน้ำหลวม หมุนแล้วฟรี น้ำไม่ไหล", "ใต้อ่างมีน้ำซึมออกมาตลอด"],
    progress: ["ปิดวาล์วน้ำไว้ก่อนแล้ว กำลังเปลี่ยนอะไหล่"],
    fixes: ["เปลี่ยนวาล์วก๊อกน้ำใหม่ ทดสอบแล้วไม่มีน้ำรั่ว", "เปลี่ยนสายน้ำดีและพันเทปเกลียวใหม่ใต้อ่าง"],
    holds: ["รอก๊อกน้ำรุ่นเดิมจากผู้จำหน่าย"],
  },
  {
    category: "ประปา / สุขภัณฑ์",
    equipment: "ชักโครก",
    scene: "toilet",
    kinds: ["toilet"],
    weight: 5,
    priority: [["MEDIUM", 5], ["HIGH", 3]],
    descriptions: ["กดชักโครกแล้วน้ำไม่ลง", "น้ำไหลลงโถตลอดเวลาไม่หยุด", "ชักโครกตัน น้ำเอ่อจะล้น"],
    progress: ["กำลังทะลวงท่อโถส้วม"],
    fixes: ["เปลี่ยนชุดลูกลอยและวาล์วน้ำเข้าใหม่", "ทะลวงท่อโถส้วมที่อุดตันด้วยงูเหล็ก ใช้งานได้ปกติ"],
    holds: ["รอชุดฟลัชวาล์วจากงานพัสดุ"],
  },
  {
    category: "ประปา / สุขภัณฑ์",
    equipment: "ท่อระบายน้ำพื้น",
    scene: "drain",
    kinds: ["toilet", "canteen"],
    weight: 4,
    priority: [["MEDIUM", 4], ["HIGH", 3]],
    descriptions: ["น้ำระบายช้ามาก เอ่อขังพื้นห้องน้ำ มีกลิ่นเหม็น", "ท่อระบายน้ำตัน น้ำล้นออกมาถึงทางเดิน"],
    progress: ["กำลังล้างท่อและบ่อดักไขมัน"],
    fixes: ["ล้างท่อระบายน้ำ เก็บเศษขยะ และติดตั้งตะแกรงดักกลิ่นใหม่", "ทะลวงท่อด้วยเครื่องและล้างบ่อดักไขมัน น้ำระบายได้ปกติ"],
    holds: [],
  },
  {
    category: "คอมพิวเตอร์ / เครือข่าย",
    equipment: "คอมพิวเตอร์ประจำห้อง",
    scene: "monitor",
    kinds: ["classroom", "complab", "office", "library"],
    asset: "7440-001",
    weight: 7,
    priority: [["MEDIUM", 5], ["HIGH", 4], ["URGENT", 1]],
    descriptions: ["เปิดเครื่องไม่ติด ไฟไม่เข้าเลย", "จอฟ้าขึ้นข้อความ error หลังเปิดเครื่อง", "เครื่องช้ามาก ค้างบ่อยระหว่างสอน", "จอไม่มีสัญญาณภาพ"],
    progress: ["นำเครื่องมาตรวจที่ห้องช่างแล้ว", "กำลังสำรองข้อมูลก่อนติดตั้งระบบใหม่"],
    fixes: ["เปลี่ยน Power Supply 450W ใหม่ เปิดใช้งานได้ปกติ", "เปลี่ยน SSD 256GB และติดตั้ง Windows ใหม่พร้อมโปรแกรมที่ใช้สอน", "เปลี่ยนสาย HDMI และอัปเดตไดรเวอร์การ์ดจอ"],
    holds: ["รอ SSD จากงานพัสดุ", "ส่งเครื่องเคลมประกันกับผู้จำหน่าย"],
  },
  {
    category: "คอมพิวเตอร์ / เครือข่าย",
    equipment: "จุดกระจายสัญญาณ Wi-Fi",
    scene: "wifi",
    kinds: ["classroom", "library", "dorm", "canteen", "meeting", "office", "corridor"],
    weight: 5,
    priority: [["MEDIUM", 5], ["HIGH", 4]],
    descriptions: ["เชื่อมต่อ Wi-Fi ได้แต่ใช้อินเทอร์เน็ตไม่ได้", "สัญญาณหลุดบ่อย ใช้งานไม่ได้ทั้งชั้น", "ไฟที่ตัวกระจายสัญญาณเป็นสีแดง"],
    progress: ["ประสานศูนย์เครือข่ายตรวจสอบแล้ว"],
    fixes: ["รีเซ็ตและอัปเดตเฟิร์มแวร์ Access Point ใช้งานได้ปกติ", "เปลี่ยน PoE Injector ที่เสีย สัญญาณกลับมาปกติ", "เปลี่ยนสาย LAN ช่วงที่ถูกหนูกัดขาด"],
    holds: ["รอ Access Point ตัวใหม่จากสำนักเทคโนโลยีสารสนเทศ"],
  },
  {
    category: "คอมพิวเตอร์ / เครือข่าย",
    equipment: "เครื่องพิมพ์เลเซอร์",
    scene: "printer",
    kinds: ["office", "library"],
    asset: "7440-003",
    weight: 3,
    priority: [["LOW", 3], ["MEDIUM", 4]],
    descriptions: ["กระดาษติดบ่อย พิมพ์ได้ทีละ 2–3 แผ่น", "พิมพ์ออกมาเป็นเส้นดำตลอดแผ่น"],
    progress: ["กำลังถอดทำความสะอาดชุดดึงกระดาษ"],
    fixes: ["ทำความสะอาดลูกยางดึงกระดาษและเปลี่ยนชุดดึงกระดาษใหม่", "เปลี่ยนตลับหมึกและลูกดรัมใหม่ งานพิมพ์คมชัด"],
    holds: ["รอลูกดรัมจากผู้จำหน่าย"],
  },
  {
    category: "โสตทัศนูปกรณ์",
    equipment: "โปรเจคเตอร์",
    scene: "projector",
    kinds: ["classroom", "meeting", "lab"],
    asset: "7440-006",
    weight: 7,
    priority: [["MEDIUM", 4], ["HIGH", 5], ["URGENT", 1]],
    descriptions: ["เปิดแล้วภาพไม่ขึ้น ไฟสถานะกะพริบสีแดง", "ภาพมืดและเป็นสีเหลือง อ่านสไลด์ไม่ออก", "ต่อโน้ตบุ๊กแล้วขึ้น No Signal"],
    progress: ["ตรวจสอบแล้ว หลอดหมดอายุ", "กำลังตรวจสายสัญญาณในรางเดินสาย"],
    fixes: ["เปลี่ยนหลอดโปรเจคเตอร์ใหม่และรีเซ็ตชั่วโมงหลอด", "ทำความสะอาดฟิลเตอร์และเลนส์ ภาพสว่างคมชัด", "เปลี่ยนสาย HDMI ในรางเดินสายใหม่"],
    holds: ["รอหลอดโปรเจคเตอร์จากผู้จำหน่าย 5–7 วัน"],
  },
  {
    category: "โสตทัศนูปกรณ์",
    equipment: "ไมโครโฟนไร้สาย",
    scene: "mic",
    kinds: ["classroom", "meeting"],
    weight: 3,
    priority: [["MEDIUM", 5], ["HIGH", 2]],
    descriptions: ["เสียงขาดเป็นช่วงๆ", "เปิดไมค์แล้วไม่มีเสียงออกลำโพง"],
    progress: ["กำลังตรวจคลื่นความถี่ของเครื่องรับ"],
    fixes: ["จับคู่คลื่นความถี่ใหม่และเปลี่ยนถ่านชาร์จ", "เปลี่ยนแคปซูลไมโครโฟน เสียงชัดปกติ"],
    holds: [],
  },
  {
    category: "โสตทัศนูปกรณ์",
    equipment: "ลำโพงติดผนัง",
    scene: "speaker",
    kinds: ["classroom", "meeting", "canteen"],
    weight: 2,
    priority: [["LOW", 3], ["MEDIUM", 4]],
    descriptions: ["มีเสียงจี่ตลอดเวลา", "ลำโพงข้างขวาไม่มีเสียง"],
    progress: ["กำลังตรวจสายสัญญาณ"],
    fixes: ["เปลี่ยนดอกลำโพงที่ขาดและเปลี่ยนสายสัญญาณ"],
    holds: ["รอดอกลำโพงจากผู้จำหน่าย"],
  },
  {
    category: "เฟอร์นิเจอร์",
    equipment: "เก้าอี้เลคเชอร์",
    scene: "chair",
    kinds: ["classroom", "library"],
    weight: 5,
    priority: [["LOW", 5], ["MEDIUM", 3]],
    descriptions: ["ขาเก้าอี้หัก นั่งไม่ได้ 4 ตัว", "แผ่นรองเขียนหลุด 3 ตัว", "เก้าอี้โยกเอียง น็อตหลุด"],
    progress: ["ขนเก้าอี้มาซ่อมที่ห้องช่างแล้ว"],
    fixes: ["เชื่อมขาเก้าอี้และเปลี่ยนน็อตใหม่ 4 ตัว", "เปลี่ยนแผ่นรองเขียนใหม่ 3 ชุด"],
    holds: ["รอแผ่นรองเขียนจากงานพัสดุ"],
  },
  {
    category: "เฟอร์นิเจอร์",
    equipment: "ประตูห้อง / ลูกบิด",
    scene: "door",
    kinds: ["classroom", "office", "dorm", "toilet", "meeting", "lab"],
    weight: 6,
    priority: [["MEDIUM", 4], ["HIGH", 3]],
    descriptions: ["ลูกบิดประตูหลวม ล็อกไม่ได้", "ประตูปิดไม่สนิท บานพับหลุด", "กุญแจหักคารูกุญแจ เข้าห้องไม่ได้"],
    progress: ["กำลังถอดชุดลูกบิดเดิม"],
    fixes: ["เปลี่ยนลูกบิดประตูใหม่พร้อมกุญแจ 3 ดอก", "ขันบานพับและเปลี่ยนสกรูใหม่ ประตูปิดสนิท", "ถอดไส้กุญแจที่หักและเปลี่ยนไส้กุญแจใหม่"],
    holds: [],
  },
  {
    category: "อาคาร / โครงสร้าง",
    equipment: "ฝ้าเพดาน",
    scene: "ceiling",
    kinds: ["classroom", "office", "library", "corridor", "dorm", "canteen"],
    weight: 4,
    priority: [["MEDIUM", 4], ["HIGH", 3]],
    descriptions: ["ฝ้ามีรอยรั่วซึม น้ำหยดเวลาฝนตก", "ฝ้าเพดานยุบตัวเป็นคราบน้ำ เกรงว่าจะหล่นลงมา"],
    progress: ["ขึ้นตรวจเหนือฝ้าแล้ว พบรอยรั่วที่รางน้ำ"],
    fixes: ["ซ่อมรอยรั่วรางน้ำบนหลังคาและเปลี่ยนแผ่นฝ้ายิปซัม 2 แผ่น", "อุดรอยรั่วท่อน้ำทิ้งแอร์เหนือฝ้าและเปลี่ยนฝ้าแผ่นใหม่"],
    holds: ["รอผู้รับเหมาซ่อมหลังคา (ต้องรอฝนหยุด)"],
  },
  {
    category: "อาคาร / โครงสร้าง",
    equipment: "กระเบื้องพื้น",
    scene: "floor",
    kinds: ["corridor", "classroom", "canteen", "toilet"],
    weight: 3,
    priority: [["MEDIUM", 5], ["HIGH", 2]],
    descriptions: ["กระเบื้องแตกยกตัว เสี่ยงสะดุดล้ม", "กระเบื้องร่อนเป็นโพรง เดินแล้วมีเสียง"],
    progress: ["กั้นพื้นที่ไว้แล้ว กำลังสกัดกระเบื้องเดิม"],
    fixes: ["สกัดและปูกระเบื้องใหม่ 6 แผ่น พร้อมยาแนว"],
    holds: ["รอกระเบื้องสีเดิมจากผู้จำหน่าย"],
  },
  {
    category: "อื่นๆ",
    equipment: "ป้ายบอกทาง",
    scene: "sign",
    kinds: ["corridor"],
    weight: 2,
    priority: [["LOW", 4], ["MEDIUM", 3]],
    descriptions: ["ป้ายบอกทางหลุดห้อยลงมา เสี่ยงตกใส่คน", "ป้ายทางหนีไฟเอียงจนอ่านไม่ได้"],
    progress: ["กำลังติดตั้งป้ายใหม่"],
    fixes: ["ติดตั้งป้ายใหม่ด้วยพุกและสกรู 4 จุด"],
    holds: [],
  },
  {
    category: "อื่นๆ",
    equipment: "ลิฟต์โดยสาร",
    scene: "elevator",
    kinds: ["corridor"],
    where: /ลิฟต์/,
    weight: 3,
    priority: [["HIGH", 5], ["URGENT", 3]],
    descriptions: ["ลิฟต์ค้างระหว่างชั้น ประตูไม่เปิด", "ประตูลิฟต์เปิด-ปิดกระตุก มีเสียงดัง"],
    progress: ["แจ้งบริษัทผู้ดูแลลิฟต์เข้าตรวจสอบแล้ว"],
    fixes: ["ช่างบริษัทผู้ดูแลลิฟต์ปรับตั้งเซนเซอร์ประตูและเปลี่ยนลูกล้อประตู", "รีเซ็ตระบบควบคุมและทดสอบการทำงานครบทุกชั้น"],
    holds: ["รอช่างบริษัทผู้ดูแลลิฟต์เข้าหน้างาน"],
  },
];

const REJECT_REASONS = [
  "อยู่นอกความรับผิดชอบของงานอาคาร ส่งเรื่องต่อสำนักเทคโนโลยีสารสนเทศแล้ว",
  "อุปกรณ์หมดอายุการใช้งาน ต้องจัดซื้อทดแทน ส่งเรื่องให้งานพัสดุแล้ว",
  "อยู่ในระยะประกันของผู้รับเหมา แจ้งผู้รับเหมาเข้าดำเนินการแล้ว",
];
const CANCEL_REASONS = ["แจ้งซ้ำกับใบแจ้งซ่อมเดิม", "อุปกรณ์กลับมาใช้งานได้แล้ว", "ย้ายการเรียนการสอนไปห้องอื่นแล้ว"];
// {q} / {s}: question / statement particle for the reporter (คะ, ค่ะ or ครับ).
const QUESTIONS = [
  "ช่างจะเข้ามาประมาณกี่โมง{q} พอดีมีสอนช่วงบ่าย",
  "รบกวนด่วนนะ{q} ห้องนี้มีสอบพรุ่งนี้",
  "ตอนนี้อาการหนักขึ้นกว่าเดิม{s}",
  "สะดวกเข้ามาช่วงเช้าไหม{q} ช่วงบ่ายห้องมีคนใช้",
];
const ANSWERS = [
  "จะเข้าไปดูหลังเที่ยงครับ รบกวนเปิดห้องไว้ให้ด้วยนะครับ",
  "รับทราบครับ จะเร่งดำเนินการให้ก่อนครับ",
  "สั่งอะไหล่แล้ว คาดว่าจะได้รับภายในสัปดาห์นี้ครับ",
  "พรุ่งนี้เช้า 9 โมงสะดวกไหมครับ",
];
const THANKS = ["ขอบคุณมาก{s}", "ขอบคุณ{s} ใช้งานได้แล้ว", "รับทราบ{s}"];
const FEEDBACK: Record<number, string[]> = {
  5: ["ช่างมาไวมาก บริการดีเยี่ยม", "ซ่อมเรียบร้อย ทำความสะอาดให้ด้วย ประทับใจ{s}", "รวดเร็วทันใจ ขอบคุณ{s}", "อธิบายสาเหตุให้ฟังด้วย ดีมาก{s}", ""],
  4: ["ซ่อมเรียบร้อยดี{s}", "โดยรวมดี รอนิดหน่อย", "ใช้งานได้ปกติแล้ว{s}", ""],
  3: ["ใช้เวลานานกว่าที่คิด", "ซ่อมได้แต่ต้องตามหลายครั้ง", ""],
  2: ["รอนานมาก ห้องร้อนหลายวัน", "ซ่อมแล้วยังมีอาการอยู่บ้าง"],
  1: ["ยังใช้งานไม่ได้เหมือนเดิม"],
};

// ---------- people ----------------------------------------------------------

type Person = { name: string; email: string; department: string; phone?: string };

const MALE_FIRST_NAMES = ["กิตติพงษ์", "ธีรวัฒน์", "ชัยวัฒน์", "ศุภชัย"];
/** Fills {q} / {s} with the polite particles a person with this name would use. */
function politely(text: string, name: string) {
  const male = name.startsWith("นาย") || MALE_FIRST_NAMES.some((n) => name.includes(n));
  return text.replaceAll("{q}", male ? "ครับ" : "คะ").replaceAll("{s}", male ? "ครับ" : "ค่ะ");
}
const at = (local: string) => `${local}${DEMO_DOMAIN}`;

const TECHNICIANS: (Person & { skills: CategoryName[] })[] = [
  { name: "นายประเสริฐ คงมั่น", email: at("prasert.k"), department: "กองอาคารสถานที่ (งานไฟฟ้า)", phone: "053000211", skills: ["ไฟฟ้า / แสงสว่าง", "อื่นๆ"] },
  { name: "นายอำนาจ ศรีเมือง", email: at("amnat.s"), department: "กองอาคารสถานที่ (งานเครื่องปรับอากาศ)", phone: "053000212", skills: ["เครื่องปรับอากาศ"] },
  { name: "นายสุรชัย ทองคำ", email: at("surachai.t"), department: "กองอาคารสถานที่ (งานประปา)", phone: "053000213", skills: ["ประปา / สุขภัณฑ์", "อาคาร / โครงสร้าง"] },
  { name: "นายณัฐพล วงศ์ไชย", email: at("nattapon.w"), department: "สำนักเทคโนโลยีสารสนเทศ", phone: "053000214", skills: ["คอมพิวเตอร์ / เครือข่าย", "โสตทัศนูปกรณ์"] },
  { name: "นายบุญมี แก้วกาศ", email: at("boonmee.k"), department: "กองอาคารสถานที่ (งานช่างไม้)", phone: "053000215", skills: ["เฟอร์นิเจอร์", "อาคาร / โครงสร้าง", "อื่นๆ"] },
];

const TEACHERS: Person[] = [
  { name: "ผศ.ดร.วรรณา ศรีสุข", email: at("wanna.s"), department: "คณะบริหารธุรกิจ", phone: "053000301" },
  { name: "อ.กิตติพงษ์ แสงทอง", email: at("kittipong.s"), department: "คณะวิศวกรรมศาสตร์" },
  { name: "รศ.ดร.สุภาพร วงศ์ใหญ่", email: at("supaporn.w"), department: "คณะวิทยาศาสตร์", phone: "053000302" },
  { name: "อ.ธีรวัฒน์ บุญมา", email: at("teerawat.b"), department: "คณะศิลปศาสตร์" },
  { name: "ดร.ปิยะนุช คำแสน", email: at("piyanuch.k"), department: "คณะวิทยาศาสตร์" },
  { name: "อ.ชัยวัฒน์ อินทรวงศ์", email: at("chaiwat.i"), department: "คณะบริหารธุรกิจ" },
  { name: "ผศ.นันทนา มณีวงศ์", email: at("nantana.m"), department: "คณะเกษตรศาสตร์" },
  { name: "อ.ศุภชัย ทองประเสริฐ", email: at("supachai.t"), department: "คณะวิศวกรรมศาสตร์" },
];

const STAFF: Person[] = [
  { name: "นางสาวพิมพ์ชนก ใจดี", email: at("pimchanok.j"), department: "กองกลาง (งานสารบรรณ)", phone: "053000401" },
  { name: "นายสมศักดิ์ มีสุข", email: at("somsak.m"), department: "กองคลัง", phone: "053000402" },
  { name: "นางรัตนา พรหมมา", email: at("rattana.p"), department: "กองการเจ้าหน้าที่", phone: "053000403" },
  { name: "นางสาวกมลวรรณ ทองดี", email: at("kamonwan.t"), department: "สำนักหอสมุด", phone: "053000404" },
  { name: "นางจันทร์เพ็ญ ศรีวงศ์", email: at("janpen.s"), department: "สำนักหอสมุด" },
  { name: "นางสาวนภัสสร แก้วมณี", email: at("napatsorn.k"), department: "กองนโยบายและแผน", phone: "053000405" },
  { name: "นายอนุชา ดวงดี", email: at("anucha.d"), department: "กองกิจการนักศึกษา (งานหอพัก)", phone: "053000406" },
  { name: "นางสาวศิริพร คำมา", email: at("siriporn.k"), department: "งานโรงอาหาร กองกิจการนักศึกษา" },
];

const STUDENTS: Person[] = [
  ["นายภูมิพัฒน์ สุขสวัสดิ์", "6504101201", "คณะวิศวกรรมศาสตร์"],
  ["นางสาวชนิดา ปัญญาดี", "6604101318", "คณะบริหารธุรกิจ"],
  ["นายธนกฤต วงศ์ษา", "6504101422", "คณะวิทยาศาสตร์"],
  ["นางสาวอรอุมา ศรีวิชัย", "6704101107", "คณะศิลปศาสตร์"],
  ["นายศุภกร จันทร์แก้ว", "6604101256", "คณะเกษตรศาสตร์"],
  ["นางสาวณัฐธิดา บุญเรือง", "6704101333", "คณะวิทยาศาสตร์"],
  ["นายกฤษดา ใจมั่น", "6504101190", "คณะวิศวกรรมศาสตร์"],
  ["นางสาวปาริชาติ คำภีระ", "6604101274", "คณะบริหารธุรกิจ"],
  ["นายวรเมธ อินต๊ะ", "6704101412", "คณะเกษตรศาสตร์"],
  ["นางสาวสุดารัตน์ ยอดคำ", "6504101365", "คณะศิลปศาสตร์"],
].map(([name, id, faculty]) => ({ name, email: at(id), department: `นักศึกษา ${faculty}` }));

/** Who usually reports problems at each kind of place. */
const REPORTERS: Record<SpotKind, [Person[], number][]> = {
  classroom: [[TEACHERS, 6], [STUDENTS, 3], [STAFF, 1]],
  complab: [[TEACHERS, 5], [STUDENTS, 4], [STAFF, 1]],
  lab: [[TEACHERS, 7], [STUDENTS, 3]],
  meeting: [[STAFF, 6], [TEACHERS, 4]],
  office: [[STAFF, 9], [TEACHERS, 1]],
  library: [[STAFF.filter((p) => p.department.includes("หอสมุด")), 6], [STUDENTS, 4]],
  dorm: [[STUDENTS, 8], [STAFF.filter((p) => p.department.includes("หอพัก")), 2]],
  toilet: [[STUDENTS, 4], [STAFF, 3], [TEACHERS, 3]],
  corridor: [[STAFF, 5], [TEACHERS, 3], [STUDENTS, 2]],
  canteen: [[STAFF.filter((p) => p.department.includes("โรงอาหาร")), 5], [STUDENTS, 5]],
};

// ---------- photo storage (same layout as src/lib/uploads.ts) ---------------

async function storePhoto(buf: Buffer, takenAt: number) {
  const filename = `${Math.round(takenAt)}-${randomBytes(8).toString("hex")}.jpg`;
  if (useBlob) {
    await put(BLOB_PREFIX + filename, buf, { access: "private", contentType: "image/jpeg", addRandomSuffix: false });
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), buf);
  }
  return { filename, mimeType: "image/jpeg", size: buf.length };
}

async function removePhotos(filenames: string[]) {
  if (filenames.length === 0) return;
  if (useBlob) {
    for (let i = 0; i < filenames.length; i += 100) await del(filenames.slice(i, i + 100).map((f) => BLOB_PREFIX + f));
  } else {
    await Promise.all(filenames.map((f) => unlink(path.join(UPLOAD_DIR, f)).catch(() => undefined)));
  }
}

/** Runs tasks with limited parallelism (photo rendering + uploads). */
async function pool<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await task(items[next++]);
    }),
  );
}

// ---------- clean -----------------------------------------------------------

async function clean() {
  const demoUsers = await prisma.user.findMany({
    where: { OR: [{ email: { endsWith: DEMO_DOMAIN } }, { email: { endsWith: LEGACY_DEMO_DOMAIN } }] },
    select: { id: true },
  });
  const ids = demoUsers.map((u) => u.id);
  const requests = await prisma.repairRequest.findMany({
    where: { reporterId: { in: ids } },
    select: { id: true, images: { select: { filename: true } } },
  });
  const requestIds = requests.map((r) => r.id);
  const strayImages = await prisma.repairImage.findMany({
    where: { uploadedById: { in: ids }, requestId: { notIn: requestIds } },
    select: { filename: true },
  });
  await removePhotos([...requests.flatMap((r) => r.images.map((i) => i.filename)), ...strayImages.map((i) => i.filename)]);

  await prisma.notification.deleteMany({
    where: { OR: [{ userId: { in: ids } }, { link: { in: requestIds.map((id) => `/requests/${id}`) } }] },
  });
  await prisma.repairRequest.deleteMany({ where: { id: { in: requestIds } } }); // activities & images cascade
  // Real requests a demo technician still holds go back to the queue.
  await prisma.repairRequest.updateMany({ where: { assigneeId: { in: ids } }, data: { assigneeId: null } });
  await prisma.requestActivity.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.repairImage.deleteMany({ where: { uploadedById: { in: ids } } });
  const tags = await prisma.qrTag.deleteMany({ where: { id: { startsWith: QR_PREFIX } } });
  const users = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`Removed ${requestIds.length} demo requests, ${users.count} demo users and ${tags.count} demo QR stickers.`);
}

// ---------- generate --------------------------------------------------------

type Spot = { buildingId: string; buildingCode: string; floor: number; location: string; kind: SpotKind; weight: number };
type PlannedEvent = {
  at: number;
  type: ActivityType;
  from?: RequestStatus;
  to?: RequestStatus;
  message?: string;
  actorId: string;
};

/** A time in Bangkok on the given day: office hours, or evenings for dorms. */
function reportTime(dayStartUtc: number, kind: SpotKind) {
  const evening = kind === "dorm" ? chance(0.6) : chance(0.1);
  const hour = evening ? between(17.5, 22.5) : between(8, 16.8);
  return dayStartUtc + hour * HOUR;
}

function bangkokDayStart(ms: number) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(ms));
  return new Date(`${day}T00:00:00+07:00`).getTime();
}

/**
 * Technicians work 08:00–17:00 on weekdays: anything else waits for the next
 * working morning (urgent and high-priority jobs go to the on-call technician).
 */
function workingTime(ms: number, urgent: boolean) {
  if (urgent) return ms;
  const local = new Date(ms + 7 * HOUR); // Bangkok wall clock via the UTC getters
  const hour = local.getUTCHours() + local.getUTCMinutes() / 60;
  const weekend = (d: number) => [0, 6].includes(new Date(d + 7 * HOUR).getUTCDay());
  if (!weekend(ms) && hour >= 8 && hour < 17) return ms;
  let next = bangkokDayStart(ms) + 8 * HOUR + between(0.1, 0.8) * HOUR;
  if (hour >= 8) next += DAY;
  while (weekend(next)) next += DAY;
  return next;
}

function ymOf(ms: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" })
    .format(new Date(ms))
    .replace("-", "");
}

async function main() {
  if (process.argv.includes("--clean")) return clean();

  const local = isLocalDatabase(connectionString);
  if (!local && !process.argv.includes("--allow-remote")) {
    throw new Error(
      "This is not a local database. To add demo data to it anyway (e.g. to show the production site),\n" +
        "re-run with --allow-remote. Demo accounts there get random passwords that are never shown.",
    );
  }
  if (!local && !useBlob) throw new Error("Set BLOB_READ_WRITE_TOKEN so the demo photos go to that site's Blob store.");
  if (await prisma.user.count({ where: { email: { endsWith: DEMO_DOMAIN } } })) {
    console.log("Demo data already exists. Run with --clean first to recreate it.");
    return;
  }

  // Master data (keeps anything that already exists).
  const buildingIds = new Map<string, string>();
  for (const b of BUILDINGS) {
    const row = await prisma.building.upsert({ where: { name: b.name }, update: {}, create: { name: b.name, code: b.code } });
    buildingIds.set(b.code, row.id);
  }
  const categoryIds = new Map<CategoryName, string>();
  for (const name of CATEGORIES) {
    const row = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categoryIds.set(name, row.id);
  }

  // Accounts.
  const hashFor = async () => bcrypt.hash(local ? "demo1234" : randomBytes(18).toString("base64url"), 10);
  const created = new Map<string, { id: string; name: string }>();
  const mk = async (p: Person, role: "USER" | "MAINTENANCE", joinedDaysAgo: number) => {
    const row = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        role,
        department: p.department,
        phone: p.phone ?? null,
        passwordHash: await hashFor(),
        createdAt: new Date(Date.now() - joinedDaysAgo * DAY),
      },
      select: { id: true, name: true },
    });
    created.set(p.email, row);
    return row;
  };
  for (const t of TECHNICIANS) await mk(t, "MAINTENANCE", between(200, 400));
  for (const p of [...TEACHERS, ...STAFF, ...STUDENTS]) await mk(p, "USER", between(185, 360));
  const user = (p: Person) => created.get(p.email)!;

  // Real accounts join in: real technicians take some jobs, the real admin assigns some.
  const realTechs = await prisma.user.findMany({
    where: { role: "MAINTENANCE", isActive: true, NOT: { email: { endsWith: DEMO_DOMAIN } } },
    select: { id: true, name: true },
  });
  const realAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true, NOT: { email: { endsWith: DEMO_DOMAIN } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  // Spots.
  const spots: Spot[] = [];
  for (const b of BUILDINGS) {
    for (let floor = 1; floor <= b.floors; floor++) {
      for (const group of b.spots) {
        const names = group.names(floor);
        for (const location of names) {
          spots.push({
            buildingId: buildingIds.get(b.code)!,
            buildingCode: b.code,
            floor,
            location,
            kind: group.kind,
            weight: (b.weight * group.weight) / Math.max(1, names.length),
          });
        }
      }
    }
  }
  const spotsFor = (p: Problem) => spots.filter((s) => p.kinds.includes(s.kind) && (!p.where || p.where.test(s.location)));
  const pickSpot = (candidates: Spot[]) => weighted(candidates.map((s) => [s, s.weight] as const));
  const assetFor = (p: Problem, s: Spot) => {
    if (!p.asset) return null;
    const h = hash(`${s.buildingCode}|${s.location}|${p.equipment}`);
    return `${p.asset}-${pad(100 + (h % 9800), 4)}/${60 + (h % 8)}`;
  };

  // Hot spots: the same fault keeps coming back at a handful of places.
  const hot = Array.from({ length: 10 }, () => {
    const problem = weighted(PROBLEMS.filter((p) => p.scene !== "sign").map((p) => [p, p.weight] as const));
    return { problem, spot: pickSpot(spotsFor(problem)) };
  });

  // QR stickers on the hot spots' equipment and a few more rooms.
  const qrTags = new Map<string, string>(); // `${buildingCode}|${location}|${equipment}` → tag id
  const qrCandidates = [
    ...hot,
    ...Array.from({ length: 6 }, () => {
      const problem = pick(PROBLEMS.filter((p) => p.asset));
      return { problem, spot: pickSpot(spotsFor(problem)) };
    }),
  ];
  for (const { problem, spot } of qrCandidates) {
    const key = `${spot.buildingCode}|${spot.location}|${problem.equipment}`;
    if (qrTags.has(key)) continue;
    const id = QR_PREFIX + randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "x");
    await prisma.qrTag.create({
      data: {
        id,
        buildingId: spot.buildingId,
        floor: spot.floor,
        location: spot.location,
        equipment: problem.equipment,
        assetNumber: assetFor(problem, spot),
        categoryId: categoryIds.get(problem.category),
        createdAt: new Date(Date.now() - HISTORY_DAYS * DAY - between(1, 20) * DAY),
      },
    });
    qrTags.set(key, id);
  }

  // Report times: more recent months are a little busier, fewer on weekends.
  const now = Date.now();
  const times: number[] = [];
  while (times.length < REQUEST_COUNT) {
    const daysAgo = HISTORY_DAYS * Math.pow(rand(), 1.35); // usage grew since launch
    const day = bangkokDayStart(now - daysAgo * DAY);
    const weekday = new Date(day + 7 * HOUR).getUTCDay();
    if ((weekday === 0 || weekday === 6) && chance(0.7)) continue;
    times.push(day);
  }
  times.sort((a, b) => a - b);

  // Running numbers continue after whatever exists in each month.
  const seqByMonth = new Map<string, number>();
  async function codeFor(createdAt: number) {
    const ym = ymOf(createdAt);
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
    return `RP-${ym}-${pad(seq, 4)}`;
  }

  type Plan = {
    code: string;
    problem: Problem;
    spot: Spot;
    reporter: { id: string; name: string };
    technician: { id: string; name: string } | null;
    realTech: boolean;
    priority: Priority;
    description: string;
    assetNumber: string | null;
    qrTagId: string | null;
    createdAt: number;
    events: PlannedEvent[];
    status: RequestStatus;
    completedAt: number | null;
    rating: number | null;
    feedback: string | null;
    assignedByAdminAt: number | null;
    photos: { kind: "BEFORE" | "AFTER"; at: number; by: string; file?: { filename: string; mimeType: string; size: number } }[];
  };

  const plans: Plan[] = [];
  const hotUses = new Map<(typeof hot)[number], number>();
  const nowCut = now - 5 * 60_000;
  for (const day of times) {
    const hotCandidate = chance(0.12) ? pick(hot) : null;
    const hotPick = hotCandidate && (hotUses.get(hotCandidate) ?? 0) < 4 ? hotCandidate : null;
    if (hotPick) hotUses.set(hotPick, (hotUses.get(hotPick) ?? 0) + 1);
    const problem = hotPick?.problem ?? weighted(PROBLEMS.map((p) => [p, p.weight] as const));
    const spot = hotPick?.spot ?? pickSpot(spotsFor(problem));
    let createdAt = reportTime(day, spot.kind);
    if (createdAt > nowCut) createdAt = now - between(0.3, 3) * HOUR;

    const reporterPerson = pick(weighted(REPORTERS[spot.kind].filter(([group]) => group.length > 0)));
    const reporter = user(reporterPerson);
    const priority = weighted(problem.priority);
    const qrTagId = qrTags.get(`${spot.buildingCode}|${spot.location}|${problem.equipment}`) ?? null;
    const viaQr = qrTagId !== null && chance(0.6);
    const asset = assetFor(problem, spot);

    // Technician: usually the specialist for this kind of work.
    const specialists = TECHNICIANS.filter((t) => t.skills.includes(problem.category));
    // The real accounts are new, so they only appear in the last couple of months.
    const recentEnough = createdAt > now - 60 * DAY;
    const realTech = recentEnough && realTechs.length > 0 && chance(0.25);
    const technician = realTech
      ? pick(realTechs)
      : user(chance(0.8) && specialists.length ? pick(specialists) : pick(TECHNICIANS));

    // Full lifecycle; whatever lies in the future is cut off below.
    const sla = SLA_HOURS[priority] * HOUR;
    const onCall = priority === "URGENT" || priority === "HIGH";
    const work = (ms: number) => workingTime(ms, onCall);
    /** Urgent/high steps scale with the deadline; the rest are office-hour steps. */
    const step = (slaShare: [number, number], hours: [number, number]) =>
      onCall ? sla * between(...slaShare) : between(...hours) * HOUR;
    const events: PlannedEvent[] = [{ at: createdAt, type: "CREATED", to: "PENDING", actorId: reporter.id }];
    const outcome = weighted([["done", 88], ["rejected", 4], ["cancelled", 5], ["stuck", 3]] as const);
    let t = createdAt;
    let assignedByAdminAt: number | null = null;
    let completedAt: number | null = null;
    let rating: number | null = null;
    let feedback: string | null = null;
    const afterPhotos: number[] = [];

    if (outcome === "cancelled") {
      t += between(0.5, 20) * HOUR;
      events.push({ at: t, type: "STATUS_CHANGED", from: "PENDING", to: "CANCELLED", message: `เหตุผล: ${pick(CANCEL_REASONS)}`, actorId: reporter.id });
    } else {
      t = work(t + step([0.02, 0.1], [0.3, 3]) + between(3, 15) * 60_000);
      if (realAdmin && recentEnough && chance(0.25)) {
        assignedByAdminAt = t;
        events.push({ at: t, type: "ASSIGNED", from: "PENDING", to: "ACCEPTED", message: `มอบหมายงานให้ ${technician.name}`, actorId: realAdmin.id });
      } else {
        events.push({ at: t, type: "STATUS_CHANGED", from: "PENDING", to: "ACCEPTED", message: `ช่างผู้รับผิดชอบ: ${technician.name}`, actorId: technician.id });
      }
      const acceptedAt = t;
      const conversation = chance(0.25);
      /** Reporter asks, technician answers — somewhere between acceptance and the end of the job. */
      const talk = (end: number) => {
        if (!conversation || end - acceptedAt < 1.5 * HOUR) return;
        const ask = acceptedAt + (end - acceptedAt) * between(0.1, 0.45);
        events.push({ at: ask, type: "COMMENT", message: politely(pick(QUESTIONS), reporter.name), actorId: reporter.id });
        events.push({ at: ask + Math.min(2 * HOUR, (end - ask) * 0.4), type: "COMMENT", message: pick(ANSWERS), actorId: technician.id });
      };
      if (outcome === "rejected") {
        t = work(t + between(1, 20) * HOUR);
        talk(t);
        events.push({ at: t, type: "STATUS_CHANGED", from: "ACCEPTED", to: "REJECTED", message: pick(REJECT_REASONS), actorId: technician.id });
      } else {
        t = work(t + step([0.02, 0.12], [0.2, 3]));
        events.push({ at: t, type: "STATUS_CHANGED", from: "ACCEPTED", to: "IN_PROGRESS", message: chance(0.7) ? pick(problem.progress) : undefined, actorId: technician.id });
        let last: RequestStatus = "IN_PROGRESS";
        if ((outcome === "stuck" || chance(priority === "URGENT" ? 0.03 : 0.1)) && problem.holds.length) {
          t = work(t + between(1, 8) * HOUR);
          events.push({ at: t, type: "STATUS_CHANGED", from: "IN_PROGRESS", to: "ON_HOLD", message: pick(problem.holds), actorId: technician.id });
          t = work(t + (outcome === "stuck" ? between(7, 25) : between(0.5, 3)) * DAY);
          events.push({ at: t, type: "STATUS_CHANGED", from: "ON_HOLD", to: "IN_PROGRESS", message: "ได้รับอะไหล่แล้ว กำลังดำเนินการต่อ", actorId: technician.id });
        }
        t = onCall
          ? work(Math.max(t + sla * between(0.05, 0.2), createdAt + sla * lognormal(0.4)))
          : work(t + lognormal(3) * HOUR * (chance(0.15) ? between(6, 16) : 1)); // bigger jobs take days
        talk(t);
        const photos = chance(0.55) ? (chance(0.8) ? 1 : 2) : 0;
        for (let i = 0; i < photos; i++) afterPhotos.push(t);
        const fix = pick(problem.fixes);
        events.push({
          at: t,
          type: "STATUS_CHANGED",
          from: last,
          to: "COMPLETED",
          message: [fix, photos ? `แนบรูปหลังซ่อม ${photos} รูป` : null].filter(Boolean).join("\n"),
          actorId: technician.id,
        });
        last = "COMPLETED";
        completedAt = t;
        if (chance(0.72)) {
          const onTime = t - createdAt <= sla;
          rating = onTime
            ? weighted([[5, 55], [4, 35], [3, 8], [2, 2]] as const)
            : weighted([[5, 18], [4, 40], [3, 28], [2, 11], [1, 3]] as const);
          feedback = politely(pick(FEEDBACK[rating]), reporter.name) || null;
          events.push({
            at: t + between(0.5, 40) * HOUR,
            type: "RATED",
            message: `${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)${feedback ? `\n${feedback}` : ""}`,
            actorId: reporter.id,
          });
          if (chance(0.3)) events.push({ at: t + between(0.3, 6) * HOUR, type: "COMMENT", message: politely(pick(THANKS), reporter.name), actorId: reporter.id });
        }
      }
    }

    // Cut the story at "now".
    const kept = events.filter((e) => e.at <= nowCut).sort((a, b) => a.at - b.at);
    const lastStatus = [...kept].reverse().find((e) => e.to)?.to ?? "PENDING";
    const ratedKept = kept.some((e) => e.type === "RATED");
    const assigned = kept.some((e) => e.to === "ACCEPTED");
    const beforeCount = weighted([[1, 55], [2, 35], [3, 10]] as const);

    plans.push({
      code: "", // numbered below, in time order
      problem,
      spot,
      reporter,
      technician: assigned ? technician : null,
      realTech: assigned && realTech,
      priority,
      description: pick(problem.descriptions) + (chance(0.25) ? politely(" รบกวนช่วยตรวจสอบให้ด้วย{s}", reporter.name) : ""),
      assetNumber: viaQr || (asset && chance(0.7)) ? asset : null,
      qrTagId: viaQr ? qrTagId : null,
      createdAt,
      events: kept,
      status: lastStatus,
      completedAt: lastStatus === "COMPLETED" ? completedAt : null,
      rating: ratedKept ? rating : null,
      feedback: ratedKept ? feedback : null,
      assignedByAdminAt: assignedByAdminAt !== null && assignedByAdminAt <= nowCut ? assignedByAdminAt : null,
      photos: [
        ...Array.from({ length: beforeCount }, () => ({ kind: "BEFORE" as const, at: createdAt, by: reporter.id })),
        ...(lastStatus === "COMPLETED" ? afterPhotos.map((a) => ({ kind: "AFTER" as const, at: a, by: technician.id })) : []),
      ],
    });
  }

  plans.sort((a, b) => a.createdAt - b.createdAt);
  for (const plan of plans) plan.code = await codeFor(plan.createdAt);

  // Photos: render and store (in parallel), then write the requests.
  const jobs = plans.flatMap((plan) => plan.photos.map((photo) => ({ plan, photo })));
  let done = 0;
  console.log(`Rendering ${jobs.length} photos → ${useBlob ? "Vercel Blob" : UPLOAD_DIR} ...`);
  await pool(jobs, useBlob ? 8 : 4, async ({ plan, photo }) => {
    const buf = await renderPhoto(plan.problem.scene, photo.kind === "BEFORE" ? "before" : "after", rand);
    photo.file = await storePhoto(buf, photo.at);
    if (++done % 50 === 0) console.log(`  ${done}/${jobs.length}`);
  });

  console.log(`Writing ${plans.length} requests ...`);
  const notifications: { userId: string; title: string; message: string; link: string; isRead: boolean; createdAt: Date }[] = [];
  for (const plan of plans) {
    const lastAt = plan.events[plan.events.length - 1].at;
    const row = await prisma.repairRequest.create({
      data: {
        code: plan.code,
        equipment: plan.problem.equipment,
        assetNumber: plan.assetNumber,
        description: plan.description,
        floor: plan.spot.floor,
        location: plan.spot.location,
        priority: plan.priority,
        status: plan.status,
        rating: plan.rating,
        feedback: plan.feedback,
        createdAt: new Date(plan.createdAt),
        updatedAt: new Date(lastAt),
        completedAt: plan.completedAt ? new Date(plan.completedAt) : null,
        buildingId: plan.spot.buildingId,
        categoryId: categoryIds.get(plan.problem.category)!,
        reporterId: plan.reporter.id,
        assigneeId: plan.status === "REJECTED" ? null : (plan.technician?.id ?? null),
        qrTagId: plan.qrTagId,
        activities: {
          create: plan.events.map((e) => ({
            type: e.type,
            fromStatus: e.from ?? null,
            toStatus: e.to ?? null,
            message: e.message ?? null,
            createdAt: new Date(e.at),
            actorId: e.actorId,
          })),
        },
        images: {
          create: plan.photos.map((p) => ({ ...p.file!, kind: p.kind, uploadedById: p.by, createdAt: new Date(p.at) })),
        },
      },
      select: { id: true },
    });

    // What the real technicians would have been notified about.
    const link = `/requests/${row.id}`;
    const recent = plan.createdAt > now - 10 * DAY;
    if (recent) {
      for (const tech of realTechs) {
        notifications.push({
          userId: tech.id,
          title: `${plan.priority === "URGENT" ? "🚨 งานเร่งด่วน" : "🔔 มีงานแจ้งซ่อมใหม่"} ${plan.code}`,
          message: `${plan.problem.equipment} — ${plan.spot.location} (แจ้งโดย ${plan.reporter.name})`,
          link,
          isRead: plan.createdAt < now - DAY || plan.status !== "PENDING",
          createdAt: new Date(plan.createdAt),
        });
      }
    }
    if (plan.realTech && plan.technician) {
      if (plan.assignedByAdminAt && realAdmin) {
        notifications.push({
          userId: plan.technician.id,
          title: `👷 คุณได้รับมอบหมายงาน ${plan.code}`,
          message: `"${plan.problem.equipment}" มอบหมายโดย ${realAdmin.name}`,
          link,
          isRead: plan.assignedByAdminAt < now - DAY,
          createdAt: new Date(plan.assignedByAdminAt),
        });
      }
      const rated = plan.events.find((e) => e.type === "RATED");
      if (rated && plan.rating) {
        notifications.push({
          userId: plan.technician.id,
          title: `⭐ ผู้แจ้งประเมินงาน ${plan.code}: ${plan.rating}/5`,
          message: plan.feedback || "ไม่มีข้อเสนอแนะเพิ่มเติม",
          link,
          isRead: rated.at < now - 2 * DAY,
          createdAt: new Date(rated.at),
        });
      }
    }
  }
  if (notifications.length) await prisma.notification.createMany({ data: notifications });

  const byStatus = plans.reduce<Record<string, number>>((m, p) => ((m[p.status] = (m[p.status] ?? 0) + 1), m), {});
  console.log(`Created ${plans.length} requests (${Object.entries(byStatus).map(([s, n]) => `${s} ${n}`).join(", ")}),`);
  console.log(`  ${jobs.length} photos, ${qrTags.size} QR stickers, ${created.size} demo accounts, ${notifications.length} notifications.`);
  console.log(local ? `Demo accounts: *${DEMO_DOMAIN} / demo1234` : "Demo accounts have random passwords (set one from จัดการผู้ใช้ if needed).");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
