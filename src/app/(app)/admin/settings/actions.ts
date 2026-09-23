"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { isId, type ActionResult } from "@/lib/validation";

export type MasterKind = "building" | "category";

const LABEL: Record<MasterKind, string> = { building: "อาคาร", category: "ประเภทงาน" };

const itemSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100, "ชื่อยาวเกินไป"),
  code: z.string().trim().max(20, "รหัสยาวเกินไป").optional(),
});

function revalidateMasterData() {
  revalidatePath("/admin/settings");
  revalidatePath("/requests/new");
  revalidatePath("/maintenance");
}

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

const INVALID = { ok: false as const, error: "ข้อมูลไม่ถูกต้อง" };
const isKind = (kind: unknown): kind is MasterKind => kind === "building" || kind === "category";

/** Creates (no id) or renames (with id) a building / category. */
export async function saveMasterItem(
  kind: MasterKind,
  input: { id?: string; name: string; code?: string },
): Promise<ActionResult> {
  if (!(await currentUser(["ADMIN"]))) return { ok: false, error: "เฉพาะผู้ดูแลระบบเท่านั้น" };
  if (!isKind(kind) || typeof input !== "object" || input === null) return INVALID;
  if (input.id !== undefined && !isId(input.id)) return INVALID;

  const parsed = itemSchema.safeParse({ name: input.name, code: input.code || undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { name, code } = parsed.data;

  try {
    if (kind === "building") {
      const data = { name, code: code ?? null };
      if (input.id) await prisma.building.update({ where: { id: input.id }, data });
      else await prisma.building.create({ data });
    } else {
      if (input.id) await prisma.category.update({ where: { id: input.id }, data: { name } });
      else await prisma.category.create({ data: { name } });
    }
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: `มี${LABEL[kind]}ชื่อนี้อยู่แล้ว` };
    throw e;
  }
  revalidateMasterData();
  return { ok: true, message: input.id ? "บันทึกการแก้ไขแล้ว" : `เพิ่ม${LABEL[kind]} "${name}" แล้ว` };
}

/** Inactive items disappear from the request form but stay on existing requests. */
export async function setMasterItemActive(kind: MasterKind, id: string, isActive: boolean): Promise<ActionResult> {
  if (!(await currentUser(["ADMIN"]))) return { ok: false, error: "เฉพาะผู้ดูแลระบบเท่านั้น" };
  if (!isKind(kind) || !isId(id) || typeof isActive !== "boolean") return INVALID;
  const updated =
    kind === "building"
      ? await prisma.building.updateMany({ where: { id }, data: { isActive } })
      : await prisma.category.updateMany({ where: { id }, data: { isActive } });
  if (updated.count === 0) return { ok: false, error: "ไม่พบข้อมูล" };
  revalidateMasterData();
  return { ok: true };
}

/** Only unused items can be deleted; used ones should be deactivated instead. */
export async function deleteMasterItem(kind: MasterKind, id: string): Promise<ActionResult> {
  if (!(await currentUser(["ADMIN"]))) return { ok: false, error: "เฉพาะผู้ดูแลระบบเท่านั้น" };
  if (!isKind(kind) || !isId(id)) return INVALID;
  const where = kind === "building" ? { buildingId: id } : { categoryId: id };
  if (await prisma.repairRequest.count({ where })) {
    return { ok: false, error: "มีใบแจ้งซ่อมที่อ้างอิงอยู่ ไม่สามารถลบได้ ให้ปิดการใช้งานแทน" };
  }
  if (kind === "building") await prisma.building.deleteMany({ where: { id } });
  else await prisma.category.deleteMany({ where: { id } });
  revalidateMasterData();
  return { ok: true };
}
