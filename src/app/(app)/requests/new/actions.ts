"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { nextRequestCode } from "@/lib/requests";
import { currentUser } from "@/lib/session";
import { deleteImages, getImageFiles, saveImage, UploadError } from "@/lib/uploads";
import { createRequestSchema, flattenErrors, formToObject, type ActionResult } from "@/lib/validation";

export async function createRepairRequest(formData: FormData): Promise<ActionResult<{ id: string; code: string }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };

  const parsed = createRequestSchema.safeParse(formToObject(formData));

  let photos: File[] = [];
  let photoError: string | undefined;
  try {
    photos = getImageFiles(formData, "photos");
    if (photos.length === 0) photoError = "กรุณาถ่ายรูปหรือแนบรูปอุปกรณ์ที่เสียหายอย่างน้อย 1 รูป";
  } catch (e) {
    if (!(e instanceof UploadError)) throw e;
    photoError = e.message;
  }

  if (!parsed.success || photoError) {
    return {
      ok: false,
      error: parsed.success ? photoError! : "กรุณากรอกข้อมูลให้ครบถ้วน",
      fieldErrors: {
        ...(parsed.success ? {} : flattenErrors(parsed.error)),
        ...(photoError ? { photos: [photoError] } : {}),
      },
    };
  }
  const data = parsed.data;

  const [building, category] = await Promise.all([
    prisma.building.findFirst({ where: { id: data.buildingId, isActive: true }, select: { id: true } }),
    prisma.category.findFirst({ where: { id: data.categoryId, isActive: true }, select: { id: true } }),
  ]);
  if (!building) return { ok: false, error: "ไม่พบอาคารที่เลือก", fieldErrors: { buildingId: ["ไม่พบอาคารที่เลือก"] } };
  if (!category) return { ok: false, error: "ไม่พบประเภทงานที่เลือก", fieldErrors: { categoryId: ["ไม่พบประเภทงานที่เลือก"] } };

  const saved: Awaited<ReturnType<typeof saveImage>>[] = [];
  try {
    for (const photo of photos) saved.push(await saveImage(photo));
  } catch (e) {
    await deleteImages(saved.map((s) => s.filename));
    if (e instanceof UploadError) return { ok: false, error: e.message, fieldErrors: { photos: [e.message] } };
    throw e;
  }

  try {
    // Retry if two requests race for the same running number.
    for (let attempt = 0; ; attempt++) {
      try {
        const request = await prisma.repairRequest.create({
          data: {
            code: await nextRequestCode(),
            equipment: data.equipment,
            assetNumber: data.assetNumber,
            description: data.description,
            floor: data.floor,
            location: data.location,
            priority: data.priority,
            buildingId: data.buildingId,
            categoryId: data.categoryId,
            reporterId: user.id,
            images: { create: saved.map((s) => ({ ...s, kind: "BEFORE" as const, uploadedById: user.id })) },
            activities: { create: { type: "CREATED", toStatus: "PENDING", actorId: user.id } },
          },
          select: { id: true, code: true },
        });
        revalidatePath("/requests");
        revalidatePath("/maintenance");
        return { ok: true, data: request };
      } catch (e) {
        const isCodeClash = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 4;
        if (!isCodeClash) throw e;
      }
    }
  } catch (e) {
    await deleteImages(saved.map((s) => s.filename));
    throw e;
  }
}
