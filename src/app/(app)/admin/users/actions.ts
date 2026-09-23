"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABEL } from "@/lib/labels";
import { notifyMaintenanceTeam, notifyUsers } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import {
  adminCreateUserSchema,
  flattenErrors,
  formToObject,
  isId,
  passwordSchema,
  ROLES,
  type ActionResult,
} from "@/lib/validation";

const NO_PERMISSION = { ok: false as const, error: "เฉพาะผู้ดูแลระบบเท่านั้น" };

function revalidateUsers() {
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/maintenance");
}

/**
 * When a technician loses staff rights or is deactivated, their unfinished jobs
 * go back to the queue so they are not stuck with nobody responsible.
 */
async function releaseOpenJobs(userId: string, userName: string, actorId: string, reason: string) {
  const jobs = await prisma.repairRequest.findMany({
    where: { assigneeId: userId, status: { in: ["ACCEPTED", "IN_PROGRESS", "ON_HOLD"] } },
    select: { id: true, status: true, code: true },
  });
  if (jobs.length === 0) return 0;

  // Release each job only if it is still this technician's and still in the
  // status we read: a job completed, cancelled or re-assigned in the meantime
  // must not be dragged back to PENDING.
  const released = await prisma.$transaction(async (tx) => {
    const done: typeof jobs = [];
    for (const job of jobs) {
      const updated = await tx.repairRequest.updateMany({
        where: { id: job.id, assigneeId: userId, status: job.status },
        data: { assigneeId: null, status: "PENDING" },
      });
      if (updated.count === 0) continue;
      await tx.requestActivity.create({
        data: {
          requestId: job.id,
          actorId,
          type: "STATUS_CHANGED",
          fromStatus: job.status,
          toStatus: "PENDING",
          message: `คืนงานเข้าคิว เนื่องจาก ${userName} ${reason}`,
        },
      });
      done.push(job);
    }
    return done;
  });
  if (released.length === 0) return 0;

  await notifyMaintenanceTeam(
    {
      title: `มีงานคืนเข้าคิว ${released.length} งาน`,
      message: `${released.map((j) => j.code).join(", ")} — รอช่างรับงาน`,
      link: "/maintenance?tab=new",
    },
    actorId,
  );
  return released.length;
}

export async function changeUserRole(userId: string, role: Role): Promise<ActionResult> {
  const admin = await currentUser(["ADMIN"]);
  if (!admin) return NO_PERMISSION;
  if (!isId(userId)) return { ok: false, error: "ไม่พบผู้ใช้" };
  if (!ROLES.includes(role)) return { ok: false, error: "สิทธิ์ไม่ถูกต้อง" };
  if (userId === admin.id) return { ok: false, error: "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้" };

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } });
  if (!target) return { ok: false, error: "ไม่พบผู้ใช้" };
  if (target.role === role) return { ok: true };

  await prisma.user.update({ where: { id: userId }, data: { role } });

  let released = 0;
  if (role === "USER") {
    released = await releaseOpenJobs(userId, target.name, admin.id, "ถูกเปลี่ยนสิทธิ์เป็นผู้ใช้งานทั่วไป");
  }
  await notifyUsers([userId], {
    title: "สิทธิ์การใช้งานของคุณถูกเปลี่ยน",
    message: `ผู้ดูแลระบบเปลี่ยนสิทธิ์ของคุณจาก "${ROLE_LABEL[target.role]}" เป็น "${ROLE_LABEL[role]}"`,
    link: "/",
  });
  revalidateUsers();
  return {
    ok: true,
    message: `เปลี่ยนสิทธิ์ของ ${target.name} เป็น "${ROLE_LABEL[role]}" แล้ว${released ? ` (คืนงานค้าง ${released} งานเข้าคิว)` : ""}`,
  };
}

export async function setUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  const admin = await currentUser(["ADMIN"]);
  if (!admin) return NO_PERMISSION;
  if (!isId(userId) || typeof isActive !== "boolean") return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  if (userId === admin.id) return { ok: false, error: "ไม่สามารถระงับบัญชีของตัวเองได้" };

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!target) return { ok: false, error: "ไม่พบผู้ใช้" };

  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  const released = isActive ? 0 : await releaseOpenJobs(userId, target.name, admin.id, "ถูกระงับบัญชี");
  revalidateUsers();
  return {
    ok: true,
    message: `${isActive ? "เปิดใช้งาน" : "ระงับ"}บัญชี ${target.name} แล้ว${released ? ` (คืนงานค้าง ${released} งานเข้าคิว)` : ""}`,
  };
}

export async function createUserByAdmin(formData: FormData): Promise<ActionResult> {
  const admin = await currentUser(["ADMIN"]);
  if (!admin) return NO_PERMISSION;

  const parsed = adminCreateUserSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "กรุณาตรวจสอบข้อมูลอีกครั้ง", fieldErrors: flattenErrors(parsed.error) };
  }
  const { password, ...data } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (exists) return { ok: false, error: "อีเมลนี้ถูกใช้งานแล้ว", fieldErrors: { email: ["อีเมลนี้ถูกใช้งานแล้ว"] } };

  await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  revalidateUsers();
  return { ok: true, message: `เพิ่มผู้ใช้ ${data.name} (${ROLE_LABEL[data.role]}) แล้ว` };
}

export async function resetUserPassword(userId: string, password: string): Promise<ActionResult> {
  const admin = await currentUser(["ADMIN"]);
  if (!admin) return NO_PERMISSION;
  if (!isId(userId)) return { ok: false, error: "ไม่พบผู้ใช้" };

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const updated = await prisma.user.updateMany({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(parsed.data, 10) },
  });
  if (updated.count === 0) return { ok: false, error: "ไม่พบผู้ใช้" };
  return { ok: true, message: "ตั้งรหัสผ่านใหม่แล้ว" };
}
