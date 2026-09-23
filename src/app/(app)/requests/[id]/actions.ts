"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyUsers } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { canViewRequest } from "@/lib/requests";
import { currentUser } from "@/lib/session";
import { isId, type ActionResult } from "@/lib/validation";
import { CANCELLABLE_STATUSES } from "@/lib/workflow";

function revalidateRequest(id: string) {
  revalidatePath(`/requests/${id}`);
  revalidatePath("/requests");
  revalidatePath("/maintenance");
}

export async function cancelRequest(requestId: string, reason: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };
  if (!isId(requestId)) return { ok: false, error: "ไม่พบใบแจ้งซ่อม" };

  const parsedReason = z.string().trim().max(500, "เหตุผลยาวเกินไป").safeParse(reason);
  if (!parsedReason.success) return { ok: false, error: parsedReason.error.issues[0].message };
  const message = parsedReason.data || null;

  const request = await prisma.repairRequest.findUnique({
    where: { id: requestId },
    select: { reporterId: true, assigneeId: true, status: true, code: true, equipment: true },
  });
  if (!request || request.reporterId !== user.id) return { ok: false, error: "ไม่พบใบแจ้งซ่อม" };
  if (!CANCELLABLE_STATUSES.includes(request.status)) {
    return { ok: false, error: "ไม่สามารถยกเลิกได้ เนื่องจากช่างเริ่มดำเนินการแล้ว" };
  }

  // Guard on status in the WHERE so a concurrent staff update isn't overwritten.
  const updated = await prisma.repairRequest.updateMany({
    where: { id: requestId, status: { in: CANCELLABLE_STATUSES } },
    data: { status: "CANCELLED" },
  });
  if (updated.count === 0) return { ok: false, error: "สถานะงานเปลี่ยนไปแล้ว กรุณารีเฟรชหน้า" };

  await prisma.requestActivity.create({
    data: {
      requestId,
      actorId: user.id,
      type: "STATUS_CHANGED",
      fromStatus: request.status,
      toStatus: "CANCELLED",
      message: message ? `เหตุผล: ${message}` : null,
    },
  });
  await notifyUsers(
    [request.assigneeId],
    {
      title: `ผู้แจ้งยกเลิกงาน ${request.code}`,
      message: `"${request.equipment}" ถูกยกเลิกโดย ${user.name}${message ? ` — ${message}` : ""}`,
      link: `/requests/${requestId}`,
    },
    user.id,
  );
  revalidateRequest(requestId);
  return { ok: true, message: "ยกเลิกใบแจ้งซ่อมแล้ว" };
}

const commentSchema = z.string().trim().min(1, "กรุณาพิมพ์ข้อความ").max(1000, "ข้อความยาวเกินไป");

export async function addComment(requestId: string, text: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };
  if (!isId(requestId)) return { ok: false, error: "ไม่พบใบแจ้งซ่อม" };

  const parsed = commentSchema.safeParse(text);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const request = await prisma.repairRequest.findUnique({
    where: { id: requestId },
    select: { reporterId: true, assigneeId: true, code: true },
  });
  if (!request || !canViewRequest(user, request)) return { ok: false, error: "ไม่พบใบแจ้งซ่อม" };

  await prisma.requestActivity.create({
    data: { requestId, actorId: user.id, type: "COMMENT", message: parsed.data },
  });
  const preview = parsed.data.length > 80 ? `${parsed.data.slice(0, 80)}…` : parsed.data;
  await notifyUsers(
    [request.reporterId, request.assigneeId],
    { title: `💬 ข้อความใหม่ใน ${request.code}`, message: `${user.name}: ${preview}`, link: `/requests/${requestId}` },
    user.id,
  );
  revalidateRequest(requestId);
  return { ok: true };
}

const ratingSchema = z.object({
  rating: z.coerce.number().int().min(1, "กรุณาให้คะแนน").max(5),
  feedback: z.string().trim().max(1000).optional(),
});

export async function rateRequest(requestId: string, input: { rating: number; feedback?: string }): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };
  if (!isId(requestId)) return { ok: false, error: "ไม่พบใบแจ้งซ่อม" };

  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { rating, feedback } = parsed.data;

  const updated = await prisma.repairRequest.updateMany({
    where: { id: requestId, reporterId: user.id, status: "COMPLETED", rating: null },
    data: { rating, feedback: feedback || null },
  });
  if (updated.count === 0) return { ok: false, error: "ไม่สามารถประเมินงานนี้ได้" };

  await prisma.requestActivity.create({
    data: {
      requestId,
      actorId: user.id,
      type: "RATED",
      message: `${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)${feedback ? `\n${feedback}` : ""}`,
    },
  });
  const request = await prisma.repairRequest.findUnique({
    where: { id: requestId },
    select: { assigneeId: true, code: true },
  });
  await notifyUsers(
    [request?.assigneeId],
    {
      title: `⭐ ผู้แจ้งประเมินงาน ${request?.code}: ${rating}/5`,
      message: feedback || "ไม่มีข้อเสนอแนะเพิ่มเติม",
      link: `/requests/${requestId}`,
    },
    user.id,
  );
  revalidateRequest(requestId);
  return { ok: true, message: "ขอบคุณสำหรับการประเมิน" };
}
