import type { Prisma } from "@/generated/prisma/client";
import type { Priority, RequestStatus } from "@/generated/prisma/enums";
import { startOfTodayBangkok } from "./dates";
import { CLOSED_STATUSES, STATUS_ORDER } from "./labels";
import { overdueWhere } from "./sla";
import { PRIORITIES } from "./validation";

/**
 * Filters of the maintenance queue, shared by the page and its CSV export so
 * the downloaded file always matches what is on screen.
 */

export const MAINTENANCE_TABS = [
  { key: "new", label: "งานใหม่รอรับ" },
  { key: "mine", label: "งานของฉัน" },
  { key: "all", label: "งานทั้งหมด" },
] as const;
export type MaintenanceTab = (typeof MAINTENANCE_TABS)[number]["key"];

export const OPEN_STATUSES = STATUS_ORDER.filter((s) => !CLOSED_STATUSES.includes(s));
/** Jobs a technician has taken but not finished. Selectable as the "ACTIVE" filter. */
export const ACTIVE_STATUSES: RequestStatus[] = ["ACCEPTED", "IN_PROGRESS", "ON_HOLD"];

type RawParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined) {
  // PostgreSQL rejects NUL bytes in text, so drop them instead of erroring.
  return typeof v === "string" ? v.replaceAll("\0", "").trim() : "";
}

export function parseMaintenanceFilters(sp: RawParams) {
  const tab: MaintenanceTab = MAINTENANCE_TABS.find((t) => t.key === sp.tab)?.key ?? "new";
  const status = (sp.status === "ACTIVE" ? "ACTIVE" : STATUS_ORDER.find((s) => s === sp.status)) as
    | RequestStatus
    | "ACTIVE"
    | undefined;
  return {
    tab,
    q: str(sp.q),
    buildingId: str(sp.building),
    priority: PRIORITIES.find((p) => p === sp.priority) as Priority | undefined,
    status,
    doneToday: tab === "all" && sp.done === "today",
    overdueOnly: sp.sla === "overdue",
  };
}
export type MaintenanceFilters = ReturnType<typeof parseMaintenanceFilters>;

export function isFiltered(f: MaintenanceFilters) {
  return Boolean(f.q || f.buildingId || f.priority || f.status || f.doneToday || f.overdueOnly);
}

export function maintenanceWhere(f: MaintenanceFilters, userId: string, now = new Date()): Prisma.RepairRequestWhereInput {
  const statusWhere = f.status === "ACTIVE" ? { in: ACTIVE_STATUSES } : f.status;
  return {
    ...(f.tab === "new" && { status: "PENDING" }),
    ...(f.tab === "mine" && { assigneeId: userId, status: statusWhere ?? { in: OPEN_STATUSES } }),
    ...(f.tab === "all" && statusWhere && { status: statusWhere }),
    ...(f.doneToday && { status: "COMPLETED", completedAt: { gte: startOfTodayBangkok(now) } }),
    // AND keeps the SLA condition separate from the search OR below.
    ...(f.overdueOnly && { AND: [overdueWhere(now)] }),
    ...(f.buildingId && { buildingId: f.buildingId }),
    ...(f.priority && { priority: f.priority }),
    ...(f.q && {
      OR: [
        { code: { contains: f.q, mode: "insensitive" } },
        { equipment: { contains: f.q, mode: "insensitive" } },
        { location: { contains: f.q, mode: "insensitive" } },
        { assetNumber: { contains: f.q, mode: "insensitive" } },
        { reporter: { name: { contains: f.q, mode: "insensitive" } } },
      ],
    }),
  };
}

/** Oldest urgent work first in the queues; newest first when browsing everything. */
export function maintenanceOrderBy(tab: MaintenanceTab): Prisma.RepairRequestOrderByWithRelationInput[] {
  return tab === "all" ? [{ createdAt: "desc" }] : [{ priority: "desc" }, { createdAt: "asc" }];
}

/** Query string for the current filters (no page number). */
export function maintenanceParams(f: MaintenanceFilters) {
  const params = new URLSearchParams({ tab: f.tab });
  if (f.q) params.set("q", f.q);
  if (f.buildingId) params.set("building", f.buildingId);
  if (f.priority) params.set("priority", f.priority);
  if (f.status) params.set("status", f.status);
  if (f.doneToday) params.set("done", "today");
  if (f.overdueOnly) params.set("sla", "overdue");
  return params;
}
