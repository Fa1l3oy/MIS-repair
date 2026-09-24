import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { prisma } from "@/lib/prisma";
import { isLoopbackOrigin, qrDataUri, requestOrigin } from "@/lib/qr";
import { requireUser } from "@/lib/session";
import { QrSheet } from "./qr-sheet";
import { QrTagForm } from "./qr-tag-form";

export const metadata: Metadata = { title: "QR Code จุดแจ้งซ่อม" };

export default async function QrCodesPage() {
  await requireUser(["ADMIN"]);
  const origin = await requestOrigin();

  const [tags, buildings, categories] = await Promise.all([
    prisma.qrTag.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        building: { select: { name: true } },
        category: { select: { name: true } },
        _count: { select: { requests: true } },
      },
    }),
    prisma.building.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);
  const byThaiName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "th");
  buildings.sort(byThaiName);
  categories.sort(byThaiName);

  const stickers = await Promise.all(
    tags.map(async (t) => {
      const url = `${origin}/q/${t.id}`;
      return {
        id: t.id,
        url,
        qr: await qrDataUri(url),
        equipment: t.equipment,
        assetNumber: t.assetNumber,
        place: [t.building.name, t.floor && `ชั้น ${t.floor}`, t.location].filter(Boolean).join(" · "),
        category: t.category?.name ?? null,
        uses: t._count.requests,
      };
    }),
  );

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="QR Code จุดแจ้งซ่อม"
          description="สร้างสติกเกอร์ QR ติดที่ห้องหรือครุภัณฑ์ ผู้ใช้สแกนด้วยกล้องมือถือแล้วจะได้ฟอร์มแจ้งซ่อมที่กรอกสถานที่ไว้ให้ทันที"
        />
      </div>

      {isLoopbackOrigin(origin) && (
        <Alert tone="info" title="QR ที่สร้างตอนนี้ชี้ไปที่ localhost" className="mb-6 print:hidden">
          มือถือจะเปิดลิงก์ localhost ไม่ได้ ก่อนพิมพ์ให้เปิดหน้านี้ผ่านโดเมนจริงของระบบ หรือผ่าน IP ของเครื่องในวง LAN
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)] print:block">
        <div className="print:hidden">
          <QrTagForm buildings={buildings} categories={categories} />
        </div>
        <QrSheet stickers={stickers} />
      </div>
    </>
  );
}
