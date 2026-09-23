import type { Priority, RequestStatus, Role } from "@/generated/prisma/enums";

export const ROLE_LABEL: Record<Role, string> = {
  USER: "ผู้ใช้งาน",
  MAINTENANCE: "ช่างซ่อมบำรุง",
  ADMIN: "ผู้ดูแลระบบ",
};

export const ROLE_STYLE: Record<Role, string> = {
  USER: "bg-slate-100 text-slate-700 ring-slate-200",
  MAINTENANCE: "bg-amber-50 text-amber-700 ring-amber-200",
  ADMIN: "bg-violet-50 text-violet-700 ring-violet-200",
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
  PENDING: "bg-sky-50 text-sky-700 ring-sky-200",
  ACCEPTED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-200",
  ON_HOLD: "bg-orange-50 text-orange-700 ring-orange-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  CANCELLED: "bg-slate-100 text-slate-500 ring-slate-200",
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
  LOW: "bg-slate-100 text-slate-600 ring-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 ring-blue-200",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-200",
  URGENT: "bg-red-50 text-red-700 ring-red-200",
};

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}
