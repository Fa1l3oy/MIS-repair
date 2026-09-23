import Link from "next/link";
import type { Priority, RequestStatus } from "@/generated/prisma/enums";
import { timeAgo } from "@/lib/dates";
import { formatDateTime, PRIORITY_LABEL, PRIORITY_STYLE } from "@/lib/labels";
import { StatusBadge } from "./badges";

export type RequestRow = {
  id: string;
  code: string;
  equipment: string;
  location: string;
  floor: string | null;
  priority: Priority;
  status: RequestStatus;
  createdAt: Date;
  building: { name: string };
  category: { name: string };
  reporter: { name: string };
  assignee: { name: string } | null;
};

function PriorityPill({ priority }: { priority: Priority }) {
  return <span className={`badge ${PRIORITY_STYLE[priority]}`}>{PRIORITY_LABEL[priority]}</span>;
}

export function RequestTable({ rows, emptyText = "ไม่พบรายการ" }: { rows: RequestRow[]; emptyText?: string }) {
  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center text-slate-500">
        <span className="text-4xl">🧰</span>
        {emptyText}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">เลขที่ / อุปกรณ์</th>
              <th className="px-4 py-3 font-medium">สถานที่</th>
              <th className="px-4 py-3 font-medium">ความเร่งด่วน</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">ผู้แจ้ง / ช่าง</th>
              <th className="px-4 py-3 font-medium">แจ้งเมื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="group relative hover:bg-indigo-50/40">
                <td className="px-4 py-3">
                  <Link href={`/requests/${r.id}`} className="after:absolute after:inset-0">
                    <span className="block font-mono text-xs text-slate-500">{r.code}</span>
                    <span className="font-medium text-slate-900 group-hover:text-indigo-700">{r.equipment}</span>
                    <span className="block text-xs text-slate-400">{r.category.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.building.name}
                  <span className="block text-xs text-slate-400">
                    {r.floor && `ชั้น ${r.floor} · `}
                    {r.location}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PriorityPill priority={r.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.reporter.name}
                  <span className="block text-xs text-slate-400">{r.assignee ? `ช่าง: ${r.assignee.name}` : "ยังไม่มีผู้รับงาน"}</span>
                </td>
                <td className="px-4 py-3 text-slate-500" title={formatDateTime(r.createdAt)}>
                  {timeAgo(r.createdAt)}
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
            <Link href={`/requests/${r.id}`} className="card block p-4 active:bg-slate-50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-slate-500">{r.code}</span>
                <StatusBadge status={r.status} />
                <PriorityPill priority={r.priority} />
              </div>
              <p className="mt-1 font-semibold">{r.equipment}</p>
              <p className="text-sm text-slate-500">
                {r.building.name}
                {r.floor && ` ชั้น ${r.floor}`} · {r.location}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {r.reporter.name} · {timeAgo(r.createdAt)}
                {r.assignee && ` · ช่าง: ${r.assignee.name}`}
              </p>
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
  building: { select: { name: true } },
  category: { select: { name: true } },
  reporter: { select: { name: true } },
  assignee: { select: { name: true } },
} as const;
