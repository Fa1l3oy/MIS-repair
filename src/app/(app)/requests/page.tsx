import type { Metadata } from "next";
import Link from "next/link";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { PageHeader } from "@/components/page-header";
import type { RequestStatus } from "@/generated/prisma/enums";
import { CLOSED_STATUSES, formatDateTime } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "รายการแจ้งซ่อมของฉัน" };

const TABS = [
  { key: "open", label: "กำลังดำเนินการ" },
  { key: "closed", label: "ปิดงานแล้ว" },
  { key: "all", label: "ทั้งหมด" },
] as const;

export default async function MyRequestsPage({ searchParams }: PageProps<"/requests">) {
  const user = await requireUser();
  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "open";

  const statusFilter: { status?: { in?: RequestStatus[]; notIn?: RequestStatus[] } } =
    tab === "open" ? { status: { notIn: CLOSED_STATUSES } } : tab === "closed" ? { status: { in: CLOSED_STATUSES } } : {};

  const requests = await prisma.repairRequest.findMany({
    where: { reporterId: user.id, ...statusFilter },
    orderBy: { createdAt: "desc" },
    include: {
      building: { select: { name: true } },
      category: { select: { name: true } },
      images: { where: { kind: "BEFORE" }, take: 1, orderBy: { createdAt: "asc" }, select: { filename: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="รายการแจ้งซ่อมของฉัน"
        description="ติดตามสถานะงานซ่อมที่คุณแจ้งไว้"
        actions={
          <Link href="/requests/new" className="btn-primary">
            + แจ้งซ่อมใหม่
          </Link>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:inline-flex">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/requests?tab=${t.key}`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium whitespace-nowrap ${
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-4xl">📭</p>
          <p className="text-slate-500">ยังไม่มีรายการแจ้งซ่อมในหมวดนี้</p>
          <Link href="/requests/new" className="btn-primary">
            แจ้งซ่อมเลย
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                className="card flex gap-4 p-4 transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {r.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element -- auth-protected upload route
                    <img
                      src={`/api/uploads/${r.images[0].filename}`}
                      alt={r.equipment}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">{r.code}</span>
                    <StatusBadge status={r.status} />
                    {(r.priority === "HIGH" || r.priority === "URGENT") && <PriorityBadge priority={r.priority} />}
                  </div>
                  <p className="mt-1 truncate font-semibold text-slate-900">{r.equipment}</p>
                  <p className="truncate text-sm text-slate-500">
                    {r.building.name}
                    {r.floor && ` ชั้น ${r.floor}`} · {r.location} · {r.category.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">แจ้งเมื่อ {formatDateTime(r.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
