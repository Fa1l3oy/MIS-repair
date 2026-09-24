import type { Prisma } from "@/generated/prisma/client";
import type { Priority, RequestStatus } from "@/generated/prisma/enums";

/**
 * Service-level targets: how long a job may take, from report to completion,
 * for each priority. Change them here and every badge, filter and KPI follows.
 */
export const SLA_HOURS: Record<Priority, number> = {
  URGENT: 4,
  HIGH: 24,
  MEDIUM: 72,
  LOW: 168,
};

const HOUR = 3_600_000;
const OPEN_STATUSES: RequestStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS", "ON_HOLD"];

/**
 * met / missed: finished on time or late · on-track / due-soon / overdue: still open
 * (due-soon = inside the last quarter of the window) · none: cancelled or rejected.
 */
export type SlaState = "met" | "missed" | "on-track" | "due-soon" | "overdue" | "none";

export type SlaInfo = { dueAt: Date; state: SlaState; remainingMs: number };

type SlaInput = { createdAt: Date; priority: Priority; status: RequestStatus; completedAt: Date | null };

export function slaDueAt(createdAt: Date, priority: Priority) {
  return new Date(createdAt.getTime() + SLA_HOURS[priority] * HOUR);
}

export function slaInfo(r: SlaInput, now = new Date()): SlaInfo {
  const dueAt = slaDueAt(r.createdAt, r.priority);
  const remainingMs = dueAt.getTime() - now.getTime();
  if (r.status === "CANCELLED" || r.status === "REJECTED") return { dueAt, state: "none", remainingMs };
  if (r.status === "COMPLETED") {
    const done = r.completedAt ?? now;
    return { dueAt, state: done <= dueAt ? "met" : "missed", remainingMs };
  }
  if (remainingMs < 0) return { dueAt, state: "overdue", remainingMs };
  const windowMs = SLA_HOURS[r.priority] * HOUR;
  return { dueAt, state: remainingMs <= windowMs * 0.25 ? "due-soon" : "on-track", remainingMs };
}

/** "45 นาที", "5 ชม.", "2 วัน" */
export function formatDuration(ms: number) {
  const minutes = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} ชม.`;
  return `${Math.round(hours / 24)} วัน`;
}

/** Prisma filter for open jobs that are past their SLA right now. */
export function overdueWhere(now = new Date()): Prisma.RepairRequestWhereInput {
  return {
    status: { in: OPEN_STATUSES },
    OR: (Object.keys(SLA_HOURS) as Priority[]).map((priority) => ({
      priority,
      createdAt: { lt: new Date(now.getTime() - SLA_HOURS[priority] * HOUR) },
    })),
  };
}
