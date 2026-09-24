import type { Priority, RequestStatus, Role } from "@/generated/prisma/enums";

export const ROLE_LABEL: Record<Role, string> = {
  USER: "ผู้ใช้งาน",
  MAINTENANCE: "ช่างซ่อมบำรุง",
  ADMIN: "ผู้ดูแลระบบ",
};

export const ROLE_STYLE: Record<Role, string> = {
  USER: "bg-zinc-100 text-zinc-700 ring-zinc-500/15",
  MAINTENANCE: "bg-amber-50 text-amber-800 ring-amber-600/20",
  ADMIN: "bg-brand-50 text-brand-700 ring-brand-600/20",
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: "รอรับเรื่อง",
  ACCEPTED: "รับเรื่องแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  ON_HOLD: "รออะไหล่/พักงาน",
  COMPLETED: "ซ่อมเสร็จแล้ว",
  REJECTED: "ไม่สามารถดำเนินการได้",
  CANCELLED: "ยกเลิกแล้ว",
};

export const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING: "bg-sky-50 text-sky-700 ring-sky-600/15",
  ACCEPTED: "bg-brand-50 text-brand-700 ring-brand-600/15",
  IN_PROGRESS: "bg-amber-50 text-amber-800 ring-amber-600/20",
  ON_HOLD: "bg-orange-50 text-orange-800 ring-orange-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/15",
  CANCELLED: "bg-zinc-100 text-zinc-500 ring-zinc-500/15",
};

export const STATUS_ORDER: RequestStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

/** Statuses where the job is finished and can no longer change. */
export const CLOSED_STATUSES: RequestStatus[] = ["COMPLETED", "REJECTED", "CANCELLED"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "ต่ำ",
  MEDIUM: "ปานกลาง",
  HIGH: "สูง",
  URGENT: "เร่งด่วน",
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: "bg-zinc-100 text-zinc-600 ring-zinc-500/15",
  MEDIUM: "bg-sky-50 text-sky-700 ring-sky-600/15",
  HIGH: "bg-orange-50 text-orange-800 ring-orange-600/20",
  URGENT: "bg-red-50 text-red-700 ring-red-600/20",
};

/** Solid dot colour for each priority (segmented picker, tables). */
export const PRIORITY_DOT: Record<Priority, string> = {
  LOW: "bg-zinc-400",
  MEDIUM: "bg-sky-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}
