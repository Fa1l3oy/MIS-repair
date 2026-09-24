import { BellRing, Camera, Lightbulb, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { RepairRequestForm } from "./repair-request-form";

export const metadata: Metadata = { title: "แจ้งซ่อม" };

const TIPS = [
  { icon: Camera, text: "ถ่ายให้เห็นทั้งตัวอุปกรณ์และจุดที่เสีย ถ้ามีป้ายเลขครุภัณฑ์ให้ถ่ายด้วย" },
  { icon: MapPin, text: "ระบุห้องหรือจุดสังเกตให้ชัด ช่างจะหาเจอได้เร็วขึ้น" },
  { icon: BellRing, text: "ระบบจะแจ้งเตือนคุณทุกครั้งที่สถานะงานเปลี่ยน" },
];

export default async function NewRequestPage() {
  const [buildings, categories] = await Promise.all([
    prisma.building.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
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
        <RepairRequestForm buildings={buildings} categories={categories} />
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
