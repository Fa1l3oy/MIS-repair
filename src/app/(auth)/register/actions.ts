"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { flattenErrors, formToObject, registerSchema, type ActionResult } from "@/lib/validation";

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "กรุณาตรวจสอบข้อมูลอีกครั้ง", fieldErrors: flattenErrors(parsed.error) };
  }
  const { name, email, phone, department, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return { ok: false, error: "อีเมลนี้ถูกใช้งานแล้ว", fieldErrors: { email: ["อีเมลนี้ถูกใช้งานแล้ว"] } };
  }

  // Self-registration always creates a USER; only admins can grant other roles.
  await prisma.user.create({
    data: { name, email, phone, department, role: "USER", passwordHash: await bcrypt.hash(password, 10) },
  });
  return { ok: true };
}
