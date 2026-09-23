"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { changePasswordSchema, flattenErrors, formToObject, profileSchema, type ActionResult } from "@/lib/validation";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };

  const parsed = profileSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "กรุณาตรวจสอบข้อมูลอีกครั้ง", fieldErrors: flattenErrors(parsed.error) };
  }
  const { name, phone, department } = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: { name, phone: phone ?? null, department: department ?? null },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "บันทึกข้อมูลส่วนตัวแล้ว" };
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };

  const parsed = changePasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "กรุณาตรวจสอบข้อมูลอีกครั้ง", fieldErrors: flattenErrors(parsed.error) };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!dbUser || !(await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash))) {
    return { ok: false, error: "รหัสผ่านปัจจุบันไม่ถูกต้อง", fieldErrors: { currentPassword: ["รหัสผ่านปัจจุบันไม่ถูกต้อง"] } };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  return { ok: true, message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" };
}
