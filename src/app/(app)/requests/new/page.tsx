import { BellRing, Camera, Lightbulb, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { prisma } from "@/lib/prisma";
import { canViewRequest } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { isId } from "@/lib/validation";
import { RepairRequestForm, type Prefill } from "./repair-request-form";

export const metadata: Metadata = { title: "แจ้งซ่อม" };

const TIPS = [
  { icon: Camera, text: "ถ่ายให้เห็นทั้งตัวอุปกรณ์และจุดที่เสีย ถ้ามีป้ายเลขครุภัณฑ์ให้ถ่ายด้วย" },
  { icon: MapPin, text: "ระบุห้องหรือจุดสังเกตให้ชัด ช่างจะหาเจอได้เร็วขึ้น" },
  { icon: BellRing, text: "ระบบจะแจ้งเตือนคุณทุกครั้งที่สถานะงานเปลี่ยน" },
];

/** Form defaults from a scanned QR sticker (?tag=) or an earlier request (?from=). */
async function loadPrefill(
  user: Awaited<ReturnType<typeof requireUser>>,
  tag: unknown,
  from: unknown,
): Promise<{ prefill?: Prefill; notice?: { tone: "info" | "error"; text: string } }> {
  if (typeof tag === "string") {
    const qr = isId(tag) ? await prisma.qrTag.findUnique({ where: { id: tag } }) : null;
    if (!qr) return { notice: { tone: "error", text: "QR Code นี้ไม่มีในระบบแล้ว กรุณากรอกข้อมูลสถานที่เอง" } };
    return {
      prefill: {
        buildingId: qr.buildingId,
        floor: qr.floor,
        location: qr.location,
        equipment: qr.equipment,
        assetNumber: qr.assetNumber,
        categoryId: qr.categoryId,
        qrTagId: qr.id,
      },
      notice: { tone: "info", text: "กรอกข้อมูลสถานที่จาก QR Code ให้แล้ว ถ่ายรูปและอธิบายอาการเสียเพิ่มได้เลย" },
    };
  }
  if (typeof from === "string" && isId(from)) {
    const r = await prisma.repairRequest.findUnique({ where: { id: from } });
    if (r && canViewRequest(user, r)) {
      return {
        prefill: {
          buildingId: r.buildingId,
          floor: r.floor,
          location: r.location,
          equipment: r.equipment,
          assetNumber: r.assetNumber,
          categoryId: r.categoryId,
          qrTagId: r.qrTagId,
        },
        notice: { tone: "info", text: `คัดลอกอุปกรณ์และสถานที่จากใบแจ้งซ่อม ${r.code} แล้ว` },
      };
    }
  }
  return {};
}

export default async function NewRequestPage({ searchParams }: PageProps<"/requests/new">) {
  const user = await requireUser();
  const { tag, from } = await searchParams;
  const [buildings, categories, { prefill, notice }] = await Promise.all([
    prisma.building.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    loadPrefill(user, tag, from),
  ]);
  // Sort in JS: ICU's Thai collation handles leading vowels (เ แ โ ไ) correctly.
  const byThaiName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "th");
  buildings.sort(byThaiName);
  categories.sort(byThaiName);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <PageHeader
          title="แจ้งซ่อม"
          description="ถ่ายรูปและกรอกรายละเอียดอุปกรณ์ที่เสียหาย ระบบจะส่งเรื่องถึงช่างซ่อมบำรุงทันที"
        />
        {notice && (
          <Alert tone={notice.tone} className="mb-5">
            {notice.text}
          </Alert>
        )}
        <RepairRequestForm buildings={buildings} categories={categories} prefill={prefill} />
      </div>
      <aside className="hidden xl:block">
        <div className="card sticky top-10 p-5">
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Lightbulb className="size-4 text-amber-500" strokeWidth={2} />
            เคล็ดลับการแจ้งซ่อม
          </p>
          <ul className="space-y-4">
            {TIPS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 text-sm text-zinc-600">
                <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" strokeWidth={1.75} />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
