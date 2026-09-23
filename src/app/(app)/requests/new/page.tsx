import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { RepairRequestForm } from "./repair-request-form";

export const metadata: Metadata = { title: "แจ้งซ่อม" };

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
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="แจ้งซ่อม"
        description="ถ่ายรูปและกรอกรายละเอียดอุปกรณ์ที่เสียหาย ระบบจะส่งเรื่องไปยังช่างซ่อมบำรุงทันที"
      />
      <RepairRequestForm buildings={buildings} categories={categories} />
    </div>
  );
}
