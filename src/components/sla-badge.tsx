import { AlarmClock, CircleCheck, Clock, TimerOff } from "lucide-react";
import { formatDateTime } from "@/lib/labels";
import { formatDuration, type SlaInfo } from "@/lib/sla";

/** Compact SLA indicator: "เกินกำหนด 5 ชม.", "เหลือ 2 ชม.", "ทันเวลา", ... */
export function SlaBadge({ sla, variant = "badge" }: { sla: SlaInfo; variant?: "badge" | "text" }) {
  const title = `กำหนดเสร็จ ${formatDateTime(sla.dueAt)}`;
  const look = {
    overdue: { icon: AlarmClock, text: `เกินกำหนด ${formatDuration(sla.remainingMs)}`, badge: "bg-rose-50 text-rose-700 ring-rose-600/20", tone: "text-rose-600" },
    "due-soon": { icon: Clock, text: `เหลือ ${formatDuration(sla.remainingMs)}`, badge: "bg-amber-50 text-amber-800 ring-amber-600/20", tone: "text-amber-600" },
    "on-track": { icon: Clock, text: `ภายใน ${formatDuration(sla.remainingMs)}`, badge: "bg-zinc-100 text-zinc-600 ring-zinc-500/15", tone: "text-zinc-400" },
    met: { icon: CircleCheck, text: "ซ่อมทันเวลา", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", tone: "text-emerald-600" },
    missed: { icon: TimerOff, text: "ซ่อมล่าช้ากว่ากำหนด", badge: "bg-orange-50 text-orange-800 ring-orange-600/20", tone: "text-orange-600" },
  } as const;
  if (sla.state === "none") return null;
  const l = look[sla.state];
  const Icon = l.icon;

  if (variant === "text") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${l.tone}`} title={title}>
        <Icon className="size-3.5" strokeWidth={2} />
        {l.text}
      </span>
    );
  }
  return (
    <span className={`badge ${l.badge}`} title={title}>
      <Icon className="size-3.5" strokeWidth={2} />
      {l.text}
    </span>
  );
}
