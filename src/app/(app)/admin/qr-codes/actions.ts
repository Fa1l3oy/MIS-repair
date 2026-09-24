"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { newQrId } from "@/lib/qr";
import { currentUser } from "@/lib/session";
import { LEN } from "@/lib/limits";
import { flattenErrors, floorSchema, formToObject, isId, text, type ActionResult } from "@/lib/validation";

const tagSchema = z.object({
  buildingId: z.string({ error: "กรุณาเลือกอาคาร" }).min(1, "กรุณาเลือกอาคาร"),
  floor: floorSchema,
  location: text(LEN.location, "ห้อง/จุดที่ตั้ง"),
  equipment: text(LEN.equipment, "อุปกรณ์").optional(),
  assetNumber: text(LEN.assetNumber, "เลขครุภัณฑ์").optional(),
  categoryId: z.string().min(1).optional(),
});

export async function createQrTag(formData: FormData): Promise<ActionResult> {
  if (!(await currentUser(["ADMIN"]))) return { ok: false, error: "เฉพาะผู้ดูแลระบบเท่านั้น" };

  const parsed = tagSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "กรุณาตรวจสอบข้อมูลอีกครั้ง", fieldErrors: flattenErrors(parsed.error) };
  }
  const data = parsed.data;
  const [building, category] = await Promise.all([
    prisma.building.findUnique({ where: { id: data.buildingId }, select: { id: true } }),
    data.categoryId ? prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }) : null,
  ]);
  if (!building) return { ok: false, error: "ไม่พบอาคารที่เลือก", fieldErrors: { buildingId: ["ไม่พบอาคารที่เลือก"] } };
  if (data.categoryId && !category) return { ok: false, error: "ไม่พบประเภทงานที่เลือก" };

  await prisma.qrTag.create({ data: { id: newQrId(), ...data } });
  revalidatePath("/admin/qr-codes");
  return { ok: true, message: "สร้าง QR Code แล้ว" };
}

export async function deleteQrTag(id: string): Promise<ActionResult> {
  if (!(await currentUser(["ADMIN"]))) return { ok: false, error: "เฉพาะผู้ดูแลระบบเท่านั้น" };
  if (!isId(id)) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  // Requests keep their data; their link to the sticker is cleared (onDelete: SetNull).
  await prisma.qrTag.deleteMany({ where: { id } });
  revalidatePath("/admin/qr-codes");
  return { ok: true };
}
