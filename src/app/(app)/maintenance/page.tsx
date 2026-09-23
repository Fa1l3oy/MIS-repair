import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RequestTable, requestRowSelect } from "@/components/request-table";
import type { Prisma } from "@/generated/prisma/client";
import type { Priority, RequestStatus } from "@/generated/prisma/enums";
import { startOfTodayBangkok } from "@/lib/dates";
import { CLOSED_STATUSES, PRIORITY_LABEL, STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requireUser, STAFF_ROLES } from "@/lib/session";
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

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
}

export default async function MaintenancePage({ searchParams }: PageProps<"/maintenance">) {
  const user = await requireUser(STAFF_ROLES);
  const sp = await searchParams;
  const tab: Tab = TABS.find((t) => t.key === sp.tab)?.key ?? "new";
  const q = str(sp.q);
  const buildingId = str(sp.building);
  const priority = PRIORITIES.find((p) => p === sp.priority) as Priority | undefined;
  const status = STATUS_ORDER.find((s) => s === sp.status) as RequestStatus | undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.RepairRequestWhereInput = {
    ...(tab === "new" && { status: "PENDING" }),
    ...(tab === "mine" && { assigneeId: user.id, status: status ?? { in: OPEN_STATUSES } }),
    ...(tab === "all" && status && { status }),
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
      prisma.repairRequest.count({ where: { status: { in: ["ACCEPTED", "IN_PROGRESS", "ON_HOLD"] } } }),
      prisma.repairRequest.count({ where: { status: "COMPLETED", completedAt: { gte: startOfTodayBangkok() } } }),
    ]),
  ]);
  buildings.sort((a, b) => a.name.localeCompare(b.name, "th"));
  const [pendingCount, mineCount, inProgressCount, doneToday] = counts;

  const stats = [
    { label: "งานใหม่รอรับ", value: pendingCount, href: "/maintenance?tab=new", tone: "text-sky-600" },
    { label: "งานของฉันที่ค้างอยู่", value: mineCount, href: "/maintenance?tab=mine", tone: "text-indigo-600" },
    { label: "กำลังดำเนินการทั้งหมด", value: inProgressCount, href: "/maintenance?tab=all&status=IN_PROGRESS", tone: "text-amber-600" },
    { label: "ซ่อมเสร็จวันนี้", value: doneToday, href: "/maintenance?tab=all&status=COMPLETED", tone: "text-emerald-600" },
  ];

  const hrefFor = (p: number) => {
    const params = new URLSearchParams({ tab });
    if (q) params.set("q", q);
    if (buildingId) params.set("building", buildingId);
    if (priority) params.set("priority", priority);
    if (status) params.set("status", status);
    params.set("page", String(p));
    return `/maintenance?${params}`;
  };

  return (
    <>
      <PageHeader title="งานซ่อมบำรุง" description="รับงานใหม่ อัปเดตสถานะ และติดตามงานซ่อมทั้งหมด" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 transition hover:border-indigo-300 hover:shadow-md">
            <p className="text-xs text-slate-500 sm:text-sm">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.tone}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:inline-flex">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/maintenance?tab=${t.key}`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium whitespace-nowrap ${
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
            {t.key === "new" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-sky-600 px-1.5 text-xs text-white">{pendingCount}</span>
            )}
          </Link>
        ))}
      </div>

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" action="/maintenance">
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={q}
          className="input lg:col-span-2"
          placeholder="ค้นหาเลขที่, อุปกรณ์, สถานที่, ผู้แจ้ง..."
          aria-label="ค้นหา"
        />
        <select name="building" defaultValue={buildingId} className="input" aria-label="อาคาร">
          <option value="">ทุกอาคาร</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue={priority ?? ""} className="input" aria-label="ความเร่งด่วน">
          <option value="">ทุกระดับความเร่งด่วน</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          {tab !== "new" && (
            <select name="status" defaultValue={status ?? ""} className="input" aria-label="สถานะ">
              <option value="">ทุกสถานะ</option>
              {(tab === "mine" ? OPEN_STATUSES.concat(CLOSED_STATUSES) : STATUS_ORDER).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="btn-primary shrink-0">
            ค้นหา
          </button>
        </div>
      </form>

      <p className="mb-2 text-sm text-slate-500">พบ {total} รายการ</p>
      <RequestTable
        rows={rows}
        emptyText={tab === "new" ? "ไม่มีงานใหม่ที่รอรับ 🎉" : tab === "mine" ? "คุณไม่มีงานค้างอยู่" : "ไม่พบรายการ"}
      />
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} hrefFor={hrefFor} />
    </>
  );
}
