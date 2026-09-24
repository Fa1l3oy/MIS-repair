import { ChevronRight, History, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/badges";
import type { Prisma } from "@/generated/prisma/client";
import { timeAgo } from "@/lib/dates";
import { formatDateTime } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const SHOWN = 5;
const RECENT_DAYS = 90;
/** This many reports at one spot within RECENT_DAYS (including this one) = a recurring problem. */
const RECURRING_AT = 3;

type Spot = {
  id: string;
  buildingId: string;
  location: string;
  assetNumber: string | null;
  qrTagId: string | null;
  createdAt: Date;
};

async function loadHistory(request: Spot, now = new Date()) {
  const asset = request.assetNumber?.trim();
  const where: Prisma.RepairRequestWhereInput = {
    id: { not: request.id },
    OR: [
      { buildingId: request.buildingId, location: { equals: request.location.trim(), mode: "insensitive" } },
      ...(asset ? [{ assetNumber: { equals: asset, mode: "insensitive" as const } }] : []),
      ...(request.qrTagId ? [{ qrTagId: request.qrTagId }] : []),
    ],
  };
  const since = new Date(now.getTime() - RECENT_DAYS * 86_400_000);

  const [rows, total, recentOthers] = await Promise.all([
    prisma.repairRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: SHOWN,
      select: {
        id: true,
        code: true,
        equipment: true,
        assetNumber: true,
        status: true,
        createdAt: true,
        activities: {
          where: { toStatus: "COMPLETED", message: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { message: true },
        },
      },
    }),
    prisma.repairRequest.count({ where }),
    prisma.repairRequest.count({ where: { ...where, createdAt: { gte: since } } }),
  ]);
  return {
    asset,
    rows,
    total,
    recent: recentOthers + (request.createdAt >= since ? 1 : 0),
    moreHref: asset
      ? `/maintenance?tab=all&q=${encodeURIComponent(asset)}`
      : `/maintenance?tab=all&building=${request.buildingId}&q=${encodeURIComponent(request.location.trim())}`,
  };
}

/**
 * Other jobs at the same room/spot or on the same asset (for technicians):
 * what was done last time, and whether it keeps breaking.
 */
export async function RepairHistory({ request }: { request: Spot }) {
  const { asset, rows, total, recent, moreHref } = await loadHistory(request);

  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <History className="size-4 text-zinc-400" strokeWidth={1.75} />
        ประวัติการซ่อมที่จุดนี้
      </h2>
      <p className="text-xs text-zinc-500">
        งานอื่นในห้อง/สถานที่เดียวกัน{asset && " หรือครุภัณฑ์เลขเดียวกัน"}
      </p>

      {recent >= RECURRING_AT && (
        <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ring-1 ring-amber-600/20">
          <TriangleAlert className="mt-px size-4 shrink-0 text-amber-500" strokeWidth={2} />
          <span>
            แจ้งซ่อมที่จุดนี้ <b>{recent} ครั้ง</b> ใน {RECENT_DAYS} วันล่าสุด — ควรตรวจหาสาเหตุ หรือพิจารณาเปลี่ยนอุปกรณ์
          </span>
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">ยังไม่เคยมีการแจ้งซ่อมที่จุดนี้มาก่อน</p>
      ) : (
        <ul className="-mx-2 mt-2">
          {rows.map((r) => {
            const note = r.activities[0]?.message;
            const sameAsset = asset && r.assetNumber?.trim().toLowerCase() === asset.toLowerCase();
            return (
              <li key={r.id}>
                <Link href={`/requests/${r.id}`} className="group flex items-start gap-2 rounded-xl px-2 py-2.5 transition hover:bg-zinc-50">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="chip">{r.code}</span>
                      <StatusBadge status={r.status} />
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium text-zinc-900">{r.equipment}</span>
                    {note && <span className="mt-0.5 block truncate text-xs text-zinc-600">การซ่อม: {note}</span>}
                    <span className="mt-0.5 block text-xs text-zinc-400">
                      <time dateTime={r.createdAt.toISOString()} title={formatDateTime(r.createdAt)}>
                        {timeAgo(r.createdAt)}
                      </time>
                      {sameAsset && " · ครุภัณฑ์เดียวกัน"}
                    </span>
                  </span>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {total > SHOWN && (
        <Link href={moreHref} className="mt-2 inline-flex text-sm font-medium text-brand-600 hover:underline">
          ดูทั้งหมด {total} รายการ
        </Link>
      )}
    </section>
  );
}
