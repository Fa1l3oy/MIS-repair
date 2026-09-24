import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushEnabled, sendPush } from "@/lib/push";

type NotificationInput = { title: string; message: string; link?: string };

/**
 * Creates the same notification for several users, and pushes it to their
 * phones/desktops after the response is sent. Never throws: a failed
 * notification must not roll back the repair-request change that caused it.
 */
export async function notifyUsers(userIds: (string | null | undefined)[], input: NotificationInput, exceptUserId?: string) {
  const recipients = [...new Set(userIds.filter((id): id is string => !!id && id !== exceptUserId))];
  if (recipients.length === 0) return;
  try {
    await prisma.notification.createMany({ data: recipients.map((userId) => ({ userId, ...input })) });
  } catch (e) {
    console.error("Failed to create notifications", e);
    return;
  }
  if (pushEnabled) {
    const push = () => sendPush(recipients, { title: input.title, body: input.message, url: input.link });
    try {
      after(push); // don't make the technician wait for the push services
    } catch {
      void push(); // called outside a request (e.g. a script)
    }
  }
}

/** Sends to every active technician; falls back to admins if there are none. */
export async function notifyMaintenanceTeam(input: NotificationInput, exceptUserId?: string) {
  try {
    let staff = await prisma.user.findMany({ where: { role: "MAINTENANCE", isActive: true }, select: { id: true } });
    if (staff.length === 0) {
      staff = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
    }
    await notifyUsers(
      staff.map((s) => s.id),
      input,
      exceptUserId,
    );
  } catch (e) {
    console.error("Failed to notify maintenance team", e);
  }
}
