import { AlarmClock, CircleCheck, Inbox, Search, UserCheck, Wrench, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RequestTable, requestRowSelect } from "@/components/request-table";
import { SegmentedLinks } from "@/components/ui/segmented";
import { StatCard } from "@/components/ui/stat-card";
import type { Prisma } from "@/generated/prisma/client";
import type { Priority, RequestStatus } from "@/generated/prisma/enums";
import { startOfTodayBangkok } from "@/lib/dates";
import { CLOSED_STATUSES, PRIORITY_LABEL, STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requireUser, STAFF_ROLES } from "@/lib/session";
import { overdueWhere } from "@/lib/sla";
import { PRIORITIES } from "@/lib/validation";

export const metadata: Metadata = { title: "งานซ่อมบำรุง" };

const PAGE_SIZE = 20;
const TABS = [
  { key: "new", label: "งานใหม่รอรับ" },
  { key: "mine", label: "งานของฉัน" },
  { key: "all", label: "งานทั้งหมด" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const OPEN_STATUSES = STATUS_ORDER.filter((s) => !CLOSED_STATUSES.includes(s));
/** Jobs a technician has taken but not finished. Selectable as the "ACTIVE" filter. */
const ACTIVE_STATUSES: RequestStatus[] = ["ACCEPTED", "IN_PROGRESS", "ON_HOLD"];

function str(v: string | string[] | undefined) {
  // PostgreSQL rejects NUL bytes in text, so drop them instead of erroring.
  return typeof v === "string" ? v.replaceAll("\0", "").trim() : "";
}

export default async function MaintenancePage({ searchParams }: PageProps<"/maintenance">) {
  const user = await requireUser(STAFF_ROLES);
  const sp = await searchParams;
  const tab: Tab = TABS.find((t) => t.key === sp.tab)?.key ?? "new";
  const q = str(sp.q);
  const buildingId = str(sp.building);
  const priority = PRIORITIES.find((p) => p === sp.priority) as Priority | undefined;
  const status = (sp.status === "ACTIVE" ? "ACTIVE" : STATUS_ORDER.find((s) => s === sp.status)) as
    | RequestStatus
    | "ACTIVE"
    | undefined;
  const statusWhere = status === "ACTIVE" ? { in: ACTIVE_STATUSES } : status;
  const doneToday = tab === "all" && sp.done === "today";
  const overdueOnly = sp.sla === "overdue";
  const now = new Date();
  const pageNum = Number(sp.page);
  const page = Number.isSafeInteger(pageNum) && pageNum > 0 ? pageNum : 1; // Prisma's skip must be an integer

  const where: Prisma.RepairRequestWhereInput = {
    ...(tab === "new" && { status: "PENDING" }),
    ...(tab === "mine" && { assigneeId: user.id, status: statusWhere ?? { in: OPEN_STATUSES } }),
    ...(tab === "all" && statusWhere && { status: statusWhere }),
    ...(doneToday && { status: "COMPLETED", completedAt: { gte: startOfTodayBangkok() } }),
    // AND keeps the SLA condition separate from the search OR below.
    ...(overdueOnly && { AND: [overdueWhere(now)] }),
    ...(buildingId && { buildingId }),
    ...(priority && { priority }),
    ...(q && {
      OR: [
        { code: { contains: q, mode: "insensitive" } },
        { equipment: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { assetNumber: { contains: q, mode: "insensitive" } },
        { reporter: { name: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };
  // Oldest urgent work first in the queues; newest first when browsing everything.
  const orderBy: Prisma.RepairRequestOrderByWithRelationInput[] =
    tab === "all" ? [{ createdAt: "desc" }] : [{ priority: "desc" }, { createdAt: "asc" }];

  const [rows, total, buildings, counts] = await Promise.all([
    prisma.repairRequest.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: requestRowSelect,
    }),
    prisma.repairRequest.count({ where }),
    prisma.building.findMany({ select: { id: true, name: true } }),
    Promise.all([
      prisma.repairRequest.count({ where: { status: "PENDING" } }),
      prisma.repairRequest.count({ where: { assigneeId: user.id, status: { in: OPEN_STATUSES } } }),
      prisma.repairRequest.count({ where: { status: { in: ACTIVE_STATUSES } } }),
      prisma.repairRequest.count({ where: { status: "COMPLETED", completedAt: { gte: startOfTodayBangkok() } } }),
      prisma.repairRequest.count({ where: overdueWhere(now) }),
    ]),
  ]);
  buildings.sort((a, b) => a.name.localeCompare(b.name, "th"));
  const [pendingCount, mineCount, inProgressCount, doneTodayCount, overdueCount] = counts;

  const stats = [
    { label: "งานใหม่รอรับ", value: pendingCount, href: "/maintenance?tab=new", tone: "sky", icon: Inbox },
    { label: "งานของฉันที่ค้างอยู่", value: mineCount, href: "/maintenance?tab=mine", tone: "brand", icon: UserCheck },
    { label: "อยู่ระหว่างดำเนินการ", value: inProgressCount, href: "/maintenance?tab=all&status=ACTIVE", tone: "amber", icon: Wrench },
    { label: "เกินกำหนด", value: overdueCount, href: "/maintenance?tab=all&sla=overdue", tone: "rose", icon: AlarmClock },
    { label: "ซ่อมเสร็จวันนี้", value: doneTodayCount, href: "/maintenance?tab=all&done=today", tone: "emerald", icon: CircleCheck },
  ] as const;
  const filtered = Boolean(q || buildingId || priority || status || doneToday || overdueOnly);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams({ tab });
    if (q) params.set("q", q);
    if (buildingId) params.set("building", buildingId);
    if (priority) params.set("priority", priority);
    if (status) params.set("status", status);
    if (doneToday) params.set("done", "today");
    if (overdueOnly) params.set("sla", "overdue");
    params.set("page", String(p));
    return `/maintenance?${params}`;
  };

  return (
    <>
      <PageHeader title="งานซ่อมบำรุง" description="รับงานใหม่ อัปเดตสถานะ และติดตามงานซ่อมทั้งหมด" />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} href={s.href} tone={s.tone} icon={s.icon} />
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedLinks
          label="มุมมองงาน"
          items={TABS.map((t) => ({
            href: `/maintenance?tab=${t.key}`,
            label: t.label,
            active: tab === t.key,
            count: t.key === "new" ? pendingCount : t.key === "mine" ? mineCount : undefined,
          }))}
        />
      </div>

      <form className="card mb-5 flex flex-col gap-3 p-3 lg:flex-row lg:items-center" action="/maintenance">
        <input type="hidden" name="tab" value={tab} />
        {overdueOnly && <input type="hidden" name="sla" value="overdue" />}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            name="q"
            defaultValue={q}
            className="input pl-10"
            placeholder="ค้นหาเลขที่ อุปกรณ์ สถานที่ หรือผู้แจ้ง"
            aria-label="ค้นหา"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap lg:flex-nowrap">
          <select name="building" defaultValue={buildingId} className="input lg:w-44" aria-label="อาคาร">
            <option value="">ทุกอาคาร</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue={priority ?? ""} className="input lg:w-40" aria-label="ความเร่งด่วน">
            <option value="">ทุกความเร่งด่วน</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          {tab !== "new" && (
            <select name="status" defaultValue={status ?? ""} className="input col-span-2 lg:w-48" aria-label="สถานะ">
              <option value="">{tab === "mine" ? "งานที่ยังไม่เสร็จ" : "ทุกสถานะ"}</option>
              <option value="ACTIVE">อยู่ระหว่างดำเนินการ (ทุกขั้นตอน)</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="btn-primary col-span-2 h-auto min-h-10 sm:col-span-1">
            <Search className="size-4" />
            ค้นหา
          </button>
        </div>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <span>
          พบ <span className="font-medium text-zinc-900 tabular-nums">{total}</span> รายการ
        </span>
        {doneToday && (
          <span className="badge bg-emerald-50 text-emerald-700 ring-emerald-600/15">เฉพาะงานที่ซ่อมเสร็จวันนี้</span>
        )}
        {overdueOnly && <span className="badge bg-rose-50 text-rose-700 ring-rose-600/20">เฉพาะงานที่เกินกำหนด</span>}
        {filtered && (
          <Link
            href={`/maintenance?tab=${tab}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            <X className="size-3.5" />
            ล้างตัวกรอง
          </Link>
        )}
      </div>
      <RequestTable
        rows={rows}
        emptyText={tab === "new" ? "ไม่มีงานใหม่ที่รอรับ" : tab === "mine" ? "คุณไม่มีงานค้างอยู่" : "ไม่พบรายการ"}
      />
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} hrefFor={hrefFor} />
    </>
  );
}
