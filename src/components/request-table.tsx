import { ChevronRight, MapPin, Wrench } from "lucide-react";
import Link from "next/link";
import type { Priority, RequestStatus } from "@/generated/prisma/enums";
import { timeAgo } from "@/lib/dates";
import { formatDateTime } from "@/lib/labels";
import { floorText } from "@/lib/limits";
import { slaInfo } from "@/lib/sla";
import { PriorityBadge, StatusBadge } from "./badges";
import { SlaBadge } from "./sla-badge";
import { Avatar } from "./ui/avatar";
import { EmptyState } from "./ui/empty-state";

export type RequestRow = {
  id: string;
  code: string;
  equipment: string;
  location: string;
  floor: number | null;
  priority: Priority;
  status: RequestStatus;
  createdAt: Date;
  completedAt: Date | null;
  building: { name: string };
  category: { name: string };
  reporter: { name: string };
  assignee: { name: string } | null;
};

export function RequestTable({ rows, emptyText = "ไม่พบรายการ" }: { rows: RequestRow[]; emptyText?: string }) {
  if (rows.length === 0) {
    return <EmptyState icon={Wrench} title={emptyText} description="ลองเปลี่ยนแท็บหรือตัวกรองดูอีกครั้ง" />;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/70 text-xs text-zinc-500">
            <tr>
              <th className="w-[30%] px-5 py-3 font-medium">อุปกรณ์</th>
              <th className="px-4 py-3 font-medium">สถานที่</th>
              <th className="px-4 py-3 font-medium">ความเร่งด่วน</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">ผู้แจ้ง / ช่าง</th>
              <th className="px-5 py-3 text-right font-medium">แจ้งเมื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <tr key={r.id} className="group relative transition hover:bg-zinc-50/70">
                <td className="px-5 py-3.5">
                  <Link href={`/requests/${r.id}`} className="block after:absolute after:inset-0">
                    <span className="font-medium text-zinc-900">{r.equipment}</span>
                    <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-zinc-500">
                      <span className="chip">{r.code}</span>
                      <span className="truncate">{r.category.name}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-zinc-700">
                  {r.building.name}
                  <span className="block text-xs text-zinc-400">
                    {r.floor != null && `${floorText(r.floor)} · `}
                    {r.location}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <PriorityBadge priority={r.priority} />
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3.5">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={r.reporter.name} size="sm" />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-zinc-800">{r.reporter.name}</span>
                      <span className="block truncate text-xs text-zinc-400">
                        {r.assignee ? `ช่าง: ${r.assignee.name}` : "ยังไม่มีผู้รับงาน"}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                  <span className="block text-zinc-500" title={formatDateTime(r.createdAt)}>
                    {timeAgo(r.createdAt)}
                  </span>
                  <span className="mt-0.5 block">
                    <SlaBadge sla={slaInfo(r)} variant="text" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="grid gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/requests/${r.id}`} className="card flex items-center gap-3 p-4 active:bg-zinc-50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="chip">{r.code}</span>
                  <StatusBadge status={r.status} />
                  <PriorityBadge priority={r.priority} />
                </div>
                <p className="mt-2 truncate font-medium text-zinc-900">{r.equipment}</p>
                <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-zinc-500">
                  <MapPin className="size-3.5 shrink-0 text-zinc-400" />
                  <span className="truncate">
                    {r.building.name}
                    {r.floor != null && ` · ${floorText(r.floor)}`} · {r.location}
                  </span>
                </p>
                <p className="mt-1.5 truncate text-xs text-zinc-400">
                  {r.reporter.name} · {timeAgo(r.createdAt)}
                  {r.assignee && ` · ช่าง: ${r.assignee.name}`}
                </p>
                <div className="mt-1">
                  <SlaBadge sla={slaInfo(r)} variant="text" />
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-zinc-300" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export const requestRowSelect = {
  id: true,
  code: true,
  equipment: true,
  location: true,
  floor: true,
  priority: true,
  status: true,
  createdAt: true,
  completedAt: true,
  building: { select: { name: true } },
  category: { select: { name: true } },
  reporter: { select: { name: true } },
  assignee: { select: { name: true } },
} as const;
