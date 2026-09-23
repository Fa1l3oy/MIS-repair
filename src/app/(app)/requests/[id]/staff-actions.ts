"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { RequestStatus } from "@/generated/prisma/enums";
import { CLOSED_STATUSES, STATUS_LABEL } from "@/lib/labels";
import { notifyUsers } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { currentUser, STAFF_ROLES } from "@/lib/session";
import { deleteImages, getImageFiles, saveImage, UploadError } from "@/lib/uploads";
import { isId, type ActionResult } from "@/lib/validation";
import { canStaffTransition } from "@/lib/workflow";

function revalidateRequest(id: string) {
  revalidatePath(`/requests/${id}`);
  revalidatePath("/requests");
  revalidatePath("/maintenance");
  revalidatePath("/admin");
}

const STALE = "สถานะงานถูกเปลี่ยนโดยผู้อื่นแล้ว กรุณารีเฟรชหน้า";

/** A technician takes an unassigned, pending job. */
export async function acceptRequest(requestId: string): Promise<ActionResult> {
  const user = await currentUser(STAFF_ROLES);
  if (!user) return { ok: false, error: "คุณไม่มีสิทธิ์ดำเนินการนี้" };
  if (!isId(requestId)) return { ok: false, error: "ไม่พบใบแจ้งซ่อม" };

  const updated = await prisma.repairRequest.updateMany({
    where: { id: requestId, status: "PENDING", assigneeId: null },
    data: { status: "ACCEPTED", assigneeId: user.id },
  });
  if (updated.count === 0) return { ok: false, error: "งานนี้มีผู้รับไปแล้ว หรือสถานะเปลี่ยนไปแล้ว" };

  await prisma.requestActivity.create({
    data: {
      requestId,
      actorId: user.id,
      type: "STATUS_CHANGED",
      fromStatus: "PENDING",
      toStatus: "ACCEPTED",
      message: `ช่างผู้รับผิดชอบ: ${user.name}`,
    },
  });
  const request = await prisma.repairRequest.findUnique({
    where: { id: requestId },
    select: { code: true, equipment: true, reporterId: true },
  });
  if (request) {
    await notifyUsers(
      [request.reporterId],
      {
        title: `ช่างรับเรื่อง ${request.code} แล้ว`,
        message: `${user.name} รับงาน "${request.equipment}" แล้ว`,
        link: `/requests/${requestId}`,
      },
      user.id,
    );
  }
  revalidateRequest(requestId);
  return { ok: true, message: "รับงานเรียบร้อยแล้ว" };
}

const statusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["ACCEPTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "REJECTED"], { error: "กรุณาเลือกสถานะ" }),
  note: z.string().trim().max(1000, "บันทึกยาวเกินไป").optional(),
});

/** Moves a job along the workflow, optionally attaching "after repair" photos. */
export async function updateRequestStatus(formData: FormData): Promise<ActionResult> {
  const user = await currentUser(STAFF_ROLES);
  if (!user) return { ok: false, error: "คุณไม่มีสิทธิ์ดำเนินการนี้" };

  const parsed = statusSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { requestId, status, note } = parsed.data;

  const request = await prisma.repairRequest.findUnique({
    where: { id: requestId },
    select: { status: true, assigneeId: true, reporterId: true, code: true, equipment: true },
  });
  if (!request) return { ok: false, error: "ไม่พบใบแจ้งซ่อม" };

  // Only the assigned technician or an admin may drive the job. A technician
  // acting on an unassigned job becomes its assignee.
  if (request.assigneeId && request.assigneeId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "งานนี้อยู่ในความรับผิดชอบของช่างท่านอื่น" };
  }
  if (!canStaffTransition(request.status, status)) {
    return {
      ok: false,
      error: `ไม่สามารถเปลี่ยนสถานะจาก "${STATUS_LABEL[request.status]}" เป็น "${STATUS_LABEL[status]}" ได้`,
    };
  }
  if (status === "REJECTED" && !note) return { ok: false, error: "กรุณาระบุเหตุผลที่ไม่สามารถดำเนินการได้" };

  let photos: File[];
  try {
    photos = getImageFiles(formData, "photos");
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, error: e.message };
    throw e;
  }

  const saved: Awaited<ReturnType<typeof saveImage>>[] = [];
  try {
    for (const p of photos) saved.push(await saveImage(p));

    const assigneeId = request.assigneeId ?? (status === "REJECTED" ? null : user.id);
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.repairRequest.updateMany({
        where: { id: requestId, status: request.status },
        data: {
          status,
          assigneeId,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
      });
      if (updated.count === 0) return false;

      if (saved.length) {
        await tx.repairImage.createMany({
          data: saved.map((s) => ({ ...s, kind: "AFTER" as const, requestId, uploadedById: user.id })),
        });
      }
      await tx.requestActivity.create({
        data: {
          requestId,
          actorId: user.id,
          type: "STATUS_CHANGED",
          fromStatus: request.status,
          toStatus: status,
          message: [note, saved.length ? `แนบรูปหลังซ่อม ${saved.length} รูป` : null].filter(Boolean).join("\n") || null,
        },
      });
      return true;
    });

    if (!result) {
      await deleteImages(saved.map((s) => s.filename));
      return { ok: false, error: STALE };
    }
  } catch (e) {
    await deleteImages(saved.map((s) => s.filename));
    if (e instanceof UploadError) return { ok: false, error: e.message };
    throw e;
  }

  await notifyUsers(
    // The reporter, plus the assigned technician when an admin updates their job.
    [request.reporterId, request.assigneeId],
    {
      title: `${request.code}: ${STATUS_LABEL[status]}`,
      message: `"${request.equipment}" ${status === "COMPLETED" ? "ซ่อมเสร็จเรียบร้อยแล้ว กรุณาประเมินความพึงพอใจ" : `เปลี่ยนสถานะเป็น "${STATUS_LABEL[status]}"`}${note ? ` — ${note}` : ""}`,
      link: `/requests/${requestId}`,
    },
    user.id,
  );
  revalidateRequest(requestId);
  return { ok: true, message: `อัปเดตสถานะเป็น "${STATUS_LABEL[status]}" แล้ว` };
}

/** Admin assigns (or re-assigns) a job to a technician. */
export async function assignRequest(requestId: string, assigneeId: string): Promise<ActionResult> {
  const user = await currentUser(["ADMIN"]);
  if (!user) return { ok: false, error: "เฉพาะผู้ดูแลระบบเท่านั้นที่มอบหมายงานได้" };
  if (!isId(requestId) || !isId(assigneeId)) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const [request, assignee] = await Promise.all([
    prisma.repairRequest.findUnique({
      where: { id: requestId },
      select: { status: true, assigneeId: true, reporterId: true, code: true, equipment: true },
    }),
    prisma.user.findFirst({
      where: { id: assigneeId, isActive: true, role: { in: STAFF_ROLES } },
      select: { id: true, name: true },
    }),
  ]);
  if (!request) return { ok: false, error: "ไม่พบใบแจ้งซ่อม" };
  if (!assignee) return { ok: false, error: "ไม่พบช่างที่เลือก" };
  if (CLOSED_STATUSES.includes(request.status)) {
    return { ok: false, error: "งานนี้ปิดไปแล้ว ไม่สามารถมอบหมายได้" };
  }
  if (request.assigneeId === assignee.id) return { ok: false, error: "งานนี้มอบหมายให้ช่างท่านนี้อยู่แล้ว" };

  const nextStatus: RequestStatus = request.status === "PENDING" ? "ACCEPTED" : request.status;
  const updated = await prisma.repairRequest.updateMany({
    where: { id: requestId, status: request.status },
    data: { assigneeId: assignee.id, status: nextStatus },
  });
  if (updated.count === 0) return { ok: false, error: STALE };

  await prisma.requestActivity.create({
    data: {
      requestId,
      actorId: user.id,
      type: "ASSIGNED",
      fromStatus: request.status,
      toStatus: nextStatus,
      message: `มอบหมายงานให้ ${assignee.name}`,
    },
  });
  const link = `/requests/${requestId}`;
  await Promise.all([
    notifyUsers(
      [assignee.id],
      { title: `👷 คุณได้รับมอบหมายงาน ${request.code}`, message: `"${request.equipment}" มอบหมายโดย ${user.name}`, link },
      user.id,
    ),
    notifyUsers(
      [request.assigneeId],
      { title: `งาน ${request.code} ถูกโอนให้ช่างท่านอื่น`, message: `ผู้ดูแลระบบมอบหมายงานนี้ให้ ${assignee.name}`, link },
      user.id,
    ),
    notifyUsers(
      [request.reporterId],
      { title: `${request.code}: มีช่างผู้รับผิดชอบแล้ว`, message: `${assignee.name} จะดำเนินการ "${request.equipment}"`, link },
      user.id,
    ),
  ]);
  revalidateRequest(requestId);
  return { ok: true, message: `มอบหมายงานให้ ${assignee.name} แล้ว` };
}
