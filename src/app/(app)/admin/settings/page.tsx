import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MasterDataList } from "./master-data-list";

export const metadata: Metadata = { title: "ตั้งค่าข้อมูล" };

export default async function AdminSettingsPage() {
  await requireUser(["ADMIN"]);
  const [buildings, categories] = await Promise.all([
    prisma.building.findMany({ include: { _count: { select: { requests: true } } } }),
    prisma.category.findMany({ include: { _count: { select: { requests: true } } } }),
  ]);
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "th");

  return (
    <>
      <PageHeader
        title="ตั้งค่าข้อมูล"
        description="จัดการรายชื่ออาคารและประเภทงานที่ใช้ในแบบฟอร์มแจ้งซ่อม — รายการที่ปิดการใช้งานจะไม่แสดงในฟอร์ม แต่ยังคงอยู่ในใบแจ้งซ่อมเดิม"
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <MasterDataList
          kind="building"
          title="อาคาร"
          withCode
          items={buildings.sort(byName).map((b) => ({
            id: b.id,
            name: b.name,
            code: b.code,
            isActive: b.isActive,
            usage: b._count.requests,
          }))}
        />
        <MasterDataList
          kind="category"
          title="ประเภทงาน"
          items={categories.sort(byName).map((c) => ({
            id: c.id,
            name: c.name,
            isActive: c.isActive,
            usage: c._count.requests,
          }))}
        />
      </div>
    </>
  );
}
