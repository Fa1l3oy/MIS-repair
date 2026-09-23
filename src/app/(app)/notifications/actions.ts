"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** Marks one notification as read and follows its link. */
export async function openNotification(id: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const n = await prisma.notification.findFirst({ where: { id, userId: user.id }, select: { link: true } });
  if (!n) redirect("/notifications");

  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  revalidatePath("/", "layout");
  // Links are always internal paths we generated; never follow anything else.
  redirect(n.link?.startsWith("/") ? n.link : "/notifications");
}

export async function markAllNotificationsRead() {
  const user = await currentUser();
  if (!user) return;
  await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/", "layout");
}
