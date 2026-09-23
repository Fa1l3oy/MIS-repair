"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeInternalPath } from "@/lib/safe-path";
import { currentUser } from "@/lib/session";
import { isId } from "@/lib/validation";

/** Marks one notification as read and follows its link. */
export async function openNotification(id: string) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!isId(id)) redirect("/notifications");

  const n = await prisma.notification.findFirst({ where: { id, userId: user.id }, select: { link: true } });
  if (!n) redirect("/notifications");

  await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { isRead: true } });
  revalidatePath("/", "layout");
  // Links are internal paths we generated; never follow anything else.
  redirect(safeInternalPath(n.link, "/notifications"));
}

export async function markAllNotificationsRead() {
  const user = await currentUser();
  if (!user) return;
  await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/", "layout");
}
