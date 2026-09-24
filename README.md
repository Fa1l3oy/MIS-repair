# ระบบแจ้งซ่อม (Repair System MIS)

ระบบแจ้งซ่อมและติดตามงานซ่อมบำรุง ผู้ใช้ถ่ายรูปอุปกรณ์ที่เสียหาย กรอกรายละเอียด แล้วส่งเรื่องถึงช่างซ่อมบำรุงได้ทันที พร้อมติดตามสถานะงานได้ตลอด

**Tech stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · PostgreSQL 16 (Docker) · Prisma 7 · NextAuth.js v4

## ฟีเจอร์ตามสิทธิ์ผู้ใช้

| สิทธิ์ | ทำอะไรได้บ้าง |
|---|---|
| **ผู้ใช้งาน (USER)** | แจ้งซ่อม: ถ่ายรูป (กล้องมือถือ/เว็บแคม) หรือเลือกรูป, กรอกอุปกรณ์ที่เสียหาย เลขครุภัณฑ์ ประเภทงาน ความเร่งด่วน อาคาร/ตึก ชั้น ห้อง/สถานที่ และอาการเสีย → กด **บันทึกและส่งแจ้งซ่อม** · ติดตามงานผ่านแถบความคืบหน้าและประวัติการดำเนินงาน · พูดคุยกับช่างในใบแจ้งซ่อม · ยกเลิกงานที่ช่างยังไม่เริ่ม · ให้คะแนนความพึงพอใจเมื่อซ่อมเสร็จ |
| **ช่างซ่อมบำรุง (MAINTENANCE)** | ทุกอย่างที่ผู้ใช้ทำได้ + หน้า **งานซ่อม**: คิวงานใหม่ (งานเร่งด่วนและงานเก่าขึ้นก่อน), งานของฉัน, ค้นหา/กรองตามอาคาร ความเร่งด่วน สถานะ · รับงาน → กำลังดำเนินการ → รออะไหล่ → ซ่อมเสร็จ (หรือแจ้งว่าไม่สามารถดำเนินการได้ พร้อมเหตุผล) · แนบรูปหลังซ่อม |
| **ผู้ดูแลระบบ (ADMIN)** | ทุกอย่างของช่าง + **กำหนด/เปลี่ยนสิทธิ์ผู้ใช้**, ระงับ/เปิดใช้บัญชี, เพิ่มผู้ใช้, ตั้งรหัสผ่านใหม่ · มอบหมายงานให้ช่าง · **แดชบอร์ด** สถิติ (จำนวนแจ้งซ่อม, เวลาซ่อมเฉลี่ย, ความพึงพอใจ, ผลงานช่าง) · จัดการรายชื่ออาคารและประเภทงาน |

สิ่งที่ปรับปรุงเพิ่มเติมจากโจทย์

- **แจ้งเตือนในระบบ** (กระดิ่ง): ช่างได้รับแจ้งทันทีเมื่อมีงานใหม่ (งานเร่งด่วนมีสัญลักษณ์ 🚨) ผู้แจ้งได้รับแจ้งเมื่อสถานะเปลี่ยน · หน้าคิวงานอัปเดตเองทุก 30 วินาที
- เลขที่ใบแจ้งซ่อมอัตโนมัติ เช่น `RP-202609-0001`
- รูปถูกย่อขนาดในเบราว์เซอร์ก่อนอัปโหลด (ประหยัดเน็ตมือถือ) และตรวจชนิดไฟล์จริงฝั่ง server · ดูรูปได้เฉพาะผู้มีสิทธิ์
- เปลี่ยนสิทธิ์/ระงับบัญชีมีผลทันทีโดยไม่ต้อง login ใหม่ · ถ้าลดสิทธิ์หรือระงับช่างที่มีงานค้าง งานจะถูกคืนเข้าคิวอัตโนมัติ
- ป้องกันการเดารหัสผ่าน (ผิด 5 ครั้ง ล็อก 15 นาที) · หน้าโปรไฟล์แก้ข้อมูลและเปลี่ยนรหัสผ่าน
- รองรับมือถือ (responsive) ทุกหน้า

## เริ่มต้นใช้งาน

ต้องมี **Node.js 20+** และ **Docker Desktop**

```bash
# 1) ตั้งค่า environment (แก้ NEXTAUTH_SECRET เป็นค่าสุ่มยาวๆ)
cp .env.example .env

# 2) เปิดฐานข้อมูล PostgreSQL ใน Docker (พอร์ต 5433 บนเครื่อง)
docker compose up -d

# 3) ติดตั้งแพ็กเกจ (จะ generate Prisma Client ให้อัตโนมัติ)
npm install

# 4) สร้างตาราง และข้อมูลตั้งต้น (อาคาร, ประเภทงาน, บัญชีทดสอบ)
npx prisma migrate deploy
npm run db:seed

# 5) (ไม่บังคับ) ข้อมูลตัวอย่าง ~80 ใบแจ้งซ่อมย้อนหลัง ให้แดชบอร์ดมีข้อมูล
npm run db:seed:demo

# 6) รันระบบ
npm run dev
```

เปิด <http://localhost:3000> (ถ้าพอร์ต 3000 ถูกใช้อยู่ Next.js จะเลือกพอร์ตถัดไปให้เอง)

> ฐานข้อมูลใช้พอร์ต **5433** บนเครื่อง เพื่อไม่ชนกับ PostgreSQL ที่อาจติดตั้งไว้ในเครื่องแล้ว (5432) — เปลี่ยนได้ที่ `POSTGRES_PORT` และ `DATABASE_URL` ใน `.env`

### บัญชีทดสอบ (จาก `npm run db:seed`)

| สิทธิ์ | อีเมล | รหัสผ่าน |
|---|---|---|
| ผู้ดูแลระบบ | `admin@repair.local` | `admin1234` |
| ช่างซ่อมบำรุง | `tech@repair.local` | `tech1234` |
| ผู้ใช้งาน | `user@repair.local` | `user1234` |

ข้อมูลตัวอย่างจาก `db:seed:demo` มีบัญชี `*@demo.local` รหัสผ่าน `demo1234` · ลบข้อมูลตัวอย่างทั้งหมดด้วย `npm run db:seed:demo -- --clean`

สมัครสมาชิกเองได้ที่หน้า `/register` (จะได้สิทธิ์ผู้ใช้งานเสมอ — ผู้ดูแลระบบเป็นผู้กำหนดสิทธิ์อื่น)

### ใช้กล้องถ่ายรูปจากมือถือ

1. ให้มือถือต่อ Wi-Fi วงเดียวกับเครื่องที่รันระบบ แล้ว `npm run dev` ตามปกติ
2. เปิด URL ที่บรรทัด `Network:` ของ `npm run dev` แสดง (เช่น `http://192.168.1.10:3000`) บนมือถือ — ถ้าเปิดไม่ได้ ให้อนุญาต Node.js ใน Windows Firewall
3. ปุ่ม **📷 ถ่ายรูป** จะเปิดแอปกล้องของมือถือ

เบราว์เซอร์อนุญาตให้เปิดกล้องแบบสดในหน้าเว็บเฉพาะบน `https://` หรือ `localhost` — ผ่าน IP แบบ http ระบบจะใช้แอปกล้องของมือถือแทนโดยอัตโนมัติ · `AUTH_TRUST_HOST=true` ใน `.env` ทำให้ login ผ่าน IP ได้ และ `allowedDevOrigins` ใน `next.config.ts` อนุญาต IP วง LAN (192.168.x.x, 10.x.x.x, 172.x.x.x) ในโหมด dev

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | รันโหมดพัฒนา |
| `npm run build` แล้ว `npm start` | build และรันโหมด production |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |
| `npm run db:up` / `npm run db:down` | เปิด/ปิดคอนเทนเนอร์ฐานข้อมูล |
| `npm run db:migrate` | สร้าง migration ใหม่หลังแก้ `prisma/schema.prisma` |
| `npm run db:deploy` | apply migration ที่มีอยู่ |
| `npm run db:seed` | ข้อมูลตั้งต้น (รันซ้ำได้ ไม่สร้างซ้ำ) |
| `npm run db:seed:demo` | ข้อมูลตัวอย่างสำหรับแดชบอร์ด |
| `npm run db:studio` | เปิด Prisma Studio ดู/แก้ข้อมูล |

ล้างฐานข้อมูลทั้งหมดแล้วเริ่มใหม่: `docker compose down -v` → `docker compose up -d` → `npx prisma migrate deploy` → `npm run db:seed`

## ขั้นตอนสถานะงาน

```
รอรับเรื่อง ──รับงาน──▶ รับเรื่องแล้ว ──▶ กำลังดำเนินการ ◀──▶ รออะไหล่/พักงาน
    │                     │                  │                     │
    │                     └──────────────────┴──────────┬──────────┘
    │                                                   ▼
    ├──▶ ไม่สามารถดำเนินการได้ (ช่าง, ต้องระบุเหตุผล)      ซ่อมเสร็จแล้ว ──▶ ผู้แจ้งให้คะแนน
    └──▶ ยกเลิกแล้ว (ผู้แจ้ง ก่อนช่างเริ่มงาน)
```

## โครงสร้างโปรเจกต์

```
docker-compose.yml          PostgreSQL 16
prisma/
  schema.prisma             โมเดลข้อมูล (User, RepairRequest, RepairImage, RequestActivity, Notification, ...)
  migrations/               SQL migrations
  seed.ts / seed-demo.ts    ข้อมูลตั้งต้น / ข้อมูลตัวอย่าง
src/
  proxy.ts                  กันหน้าที่ต้อง login (Next.js 16 ใช้ proxy แทน middleware)
  app/
    (auth)/login, register  เข้าสู่ระบบ / สมัครสมาชิก
    (app)/requests          แจ้งซ่อม, รายการของฉัน, รายละเอียด + ติดตามงาน
    (app)/maintenance       คิวงานของช่าง
    (app)/admin             แดชบอร์ด, จัดการผู้ใช้ (users), ตั้งค่าอาคาร/ประเภทงาน (settings)
    (app)/notifications     การแจ้งเตือน
    (app)/profile           โปรไฟล์
    api/auth/[...nextauth]  NextAuth
    api/uploads/[filename]  ส่งรูปภาพ (ตรวจสิทธิ์ก่อนทุกครั้ง)
  lib/                      auth, session, prisma, workflow, notifications, uploads, dashboard, validation
  components/               UI ที่ใช้ร่วมกัน (photo picker, timeline, charts, ...)
uploads/                    ไฟล์รูปที่อัปโหลด (ไม่อยู่ใน git — ควรสำรองข้อมูลพร้อมฐานข้อมูล)
```

## Deploy ขึ้น Vercel

บน Vercel ไม่มีฐานข้อมูลในเครื่องและไม่มีดิสก์ถาวร จึงใช้บริการคู่กันดังนี้

| ส่วน | บน Vercel ใช้ | หมายเหตุ |
|---|---|---|
| ฐานข้อมูล | **Neon Postgres** (Vercel Marketplace, มีแผนฟรี) | ได้ `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` (สำหรับ migrate) อัตโนมัติ |
| รูปภาพ | **Vercel Blob แบบ private** | ได้ `BLOB_STORE_ID` อัตโนมัติ — รูปยังดูได้เฉพาะผู้มีสิทธิ์ผ่าน `/api/uploads/...` |
| Region | `sin1` (สิงคโปร์) ใน `vercel.json` | สร้าง DB และ Blob ที่สิงคโปร์ด้วย จะได้เร็ว |

ขั้นตอน (ใช้ [Vercel CLI](https://vercel.com/docs/cli) — `npx vercel ...`)

```bash
npx vercel login                                   # ยืนยันตัวตนในเบราว์เซอร์
npx vercel link --yes --project mis-repair          # สร้าง/เชื่อมโปรเจกต์
npx vercel integration add neon                    # ฐานข้อมูล (เลือก region สิงคโปร์, แผน Free)
npx vercel blob create-store mis-repair-photos --access private --region sin1 --yes
npx vercel env add NEXTAUTH_SECRET production      # ใส่ค่าสุ่มยาวๆ (ดูวิธีสร้างใน .env.example)
npx vercel deploy --prod                           # build จะรัน prisma migrate deploy ให้เอง
```

จากนั้นสร้างบัญชี admin แรกบนฐานข้อมูลจริง (รหัสผ่านสุ่มและแสดงครั้งเดียว):

```bash
npx vercel env pull .env.production.local --environment production
npx tsx --env-file=.env.production.local prisma/seed.ts --production
```

(ไฟล์ `.env.production.local` มีรหัสฐานข้อมูลจริง ไม่ถูก commit แต่ควรลบทิ้งเมื่อใช้เสร็จ)

ข้อจำกัดของ Vercel ที่ระบบรองรับไว้แล้ว: request หนึ่งครั้งส่งได้ไม่เกิน 4.5 MB → หน้าแจ้งซ่อมย่อรูปแต่ละรูปให้ไม่เกิน ~700 KB และรวมไม่เกิน 4 MB ก่อนส่ง · `npm run db:seed` (รหัส `admin1234`) และ `db:seed:demo` จะไม่ยอมรันกับฐานข้อมูลที่ไม่ได้อยู่ในเครื่อง

## หมายเหตุสำหรับ production

- ตั้ง `NEXTAUTH_SECRET` เป็นค่าสุ่มใหม่ (ถ้าไม่ได้ใช้ Vercel ให้ตั้ง `NEXTAUTH_URL` เป็น URL จริงแบบ https ด้วย)
- สำรองข้อมูลทั้งฐานข้อมูลและรูปภาพ (ในเครื่อง: volume `pgdata` + โฟลเดอร์ `uploads/`, บน Vercel: Neon + Blob store)
- ตัวนับการ login ผิดเก็บในฐานข้อมูล (ตาราง `LoginThrottle`) จึงใช้ได้แม้รันหลาย instance แบบ serverless
- การล็อกนับต่ออีเมล (ไม่ใช้ IP เพราะถ้าไม่มี reverse proxy ที่เชื่อถือได้ header IP ปลอมได้) จึงมีข้อแลกเปลี่ยนว่าคนที่รู้อีเมลอาจทำให้บัญชีถูกล็อกชั่วคราวได้ ถ้าติดตั้งหลัง reverse proxy ที่กำหนด IP จริงให้ ควรนับตาม อีเมล + IP แทน
