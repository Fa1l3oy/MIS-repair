import { ChevronRight, ClipboardList, ImageOff, MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedLinks } from "@/components/ui/segmented";
import type { RequestStatus } from "@/generated/prisma/enums";
import { timeAgo } from "@/lib/dates";
import { CLOSED_STATUSES, formatDateTime } from "@/lib/labels";
import { floorText } from "@/lib/limits";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "รายการแจ้งซ่อมของฉัน" };

const TABS = [
  { key: "open", label: "กำลังดำเนินการ" },
  { key: "closed", label: "ปิดงานแล้ว" },
  { key: "all", label: "ทั้งหมด" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const FILTERS: Record<Tab, { status?: { in?: RequestStatus[]; notIn?: RequestStatus[] } }> = {
  open: { status: { notIn: CLOSED_STATUSES } },
  closed: { status: { in: CLOSED_STATUSES } },
  all: {},
};

export default async function MyRequestsPage({ searchParams }: PageProps<"/requests">) {
  const user = await requireUser();
  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.find((t) => t.key === tabParam)?.key ?? "open";

  const [requests, openCount, closedCount] = await Promise.all([
    prisma.repairRequest.findMany({
      where: { reporterId: user.id, ...FILTERS[tab] },
      orderBy: { createdAt: "desc" },
      include: {
        building: { select: { name: true } },
        category: { select: { name: true } },
        images: { where: { kind: "BEFORE" }, take: 1, orderBy: { createdAt: "asc" }, select: { filename: true } },
      },
    }),
    prisma.repairRequest.count({ where: { reporterId: user.id, ...FILTERS.open } }),
    prisma.repairRequest.count({ where: { reporterId: user.id, ...FILTERS.closed } }),
  ]);
  const counts: Record<Tab, number> = { open: openCount, closed: closedCount, all: openCount + closedCount };

  return (
    <>
      <PageHeader
        title="รายการแจ้งซ่อมของฉัน"
        description="ติดตามสถานะงานซ่อมที่คุณแจ้งไว้ได้ที่นี่"
        actions={
          <Link href="/requests/new" className="btn-primary">
            <Plus className="size-4" strokeWidth={2.25} />
            แจ้งซ่อมใหม่
          </Link>
        }
      />

      <div className="mb-5">
        <SegmentedLinks
          label="ตัวกรองสถานะ"
          items={TABS.map((t) => ({
            href: `/requests?tab=${t.key}`,
            label: t.label,
            active: tab === t.key,
            count: counts[t.key],
          }))}
        />
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={tab === "closed" ? "ยังไม่มีงานที่ปิดแล้ว" : "ยังไม่มีรายการแจ้งซ่อม"}
          description="เมื่อพบอุปกรณ์ชำรุด ถ่ายรูปและแจ้งซ่อมได้ภายในไม่กี่ขั้นตอน"
          action={
            <Link href="/requests/new" className="btn-primary">
              <Plus className="size-4" strokeWidth={2.25} />
              แจ้งซ่อมเลย
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                className="card group flex items-center gap-4 p-3 transition hover:border-zinc-300 hover:shadow-lift sm:p-4"
              >
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-zinc-300 sm:size-20">
                  {r.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- auth-protected upload route
                    <img
                      src={`/api/uploads/${r.images[0].filename}`}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <ImageOff className="size-6" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip">{r.code}</span>
                    <StatusBadge status={r.status} />
                    {(r.priority === "HIGH" || r.priority === "URGENT") && <PriorityBadge priority={r.priority} />}
                  </div>
                  <p className="mt-1.5 truncate font-medium text-zinc-900">{r.equipment}</p>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-zinc-500">
                    <MapPin className="size-3.5 shrink-0 text-zinc-400" />
                    <span className="truncate">
                      {r.building.name}
                      {r.floor != null && ` · ${floorText(r.floor)}`} · {r.location}
                    </span>
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-xs text-zinc-400" title={formatDateTime(r.createdAt)}>
                    {timeAgo(r.createdAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">{r.category.name}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
