import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

type SessionUser = Session["user"];

export function isStaff(user: Pick<SessionUser, "role">) {
  return user.role === "MAINTENANCE" || user.role === "ADMIN";
}

export function canViewRequest(user: SessionUser, request: { reporterId: string }) {
  return isStaff(user) || request.reporterId === user.id;
}

/** Next ticket code for the current month, e.g. RP-202609-0007. */
export async function nextRequestCode(now = new Date()) {
  const ym = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" })
    .format(now)
    .replace("-", "");
  const prefix = `RP-${ym}-`;
  const last = await prisma.repairRequest.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const seq = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}
