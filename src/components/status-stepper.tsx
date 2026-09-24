import { Ban, Check, CircleCheck, CircleX, Inbox, UserCheck, Wrench, type LucideIcon } from "lucide-react";
import type { RequestStatus } from "@/generated/prisma/enums";
import { timeAgo } from "@/lib/dates";
import { formatDateTime, STATUS_LABEL } from "@/lib/labels";
import { PROGRESS_STEPS } from "@/lib/workflow";

const STEP_ICON: Partial<Record<RequestStatus, LucideIcon>> = {
  PENDING: Inbox,
  ACCEPTED: UserCheck,
  IN_PROGRESS: Wrench,
  COMPLETED: CircleCheck,
};

/**
 * Progress indicator: รอรับเรื่อง → รับเรื่องแล้ว → กำลังดำเนินการ → ซ่อมเสร็จ,
 * with the time each step was reached. Rejected / cancelled jobs get a notice instead.
 */
export function StatusStepper({
  status,
  reachedAt,
  closingNote,
}: {
  status: RequestStatus;
  reachedAt: Partial<Record<RequestStatus, Date>>;
  closingNote?: string | null;
}) {
  if (status === "REJECTED" || status === "CANCELLED") {
    const rejected = status === "REJECTED";
    const Icon = rejected ? CircleX : Ban;
    const at = reachedAt[status];
    return (
      <div className={`flex gap-4 rounded-xl p-4 ${rejected ? "bg-rose-50" : "bg-zinc-100"}`}>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            rejected ? "bg-rose-100 text-rose-600" : "bg-white text-zinc-500"
          }`}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 text-sm">
          <p className={`font-semibold ${rejected ? "text-rose-800" : "text-zinc-800"}`}>
            {rejected ? "งานนี้ไม่สามารถดำเนินการได้" : "ใบแจ้งซ่อมนี้ถูกยกเลิกแล้ว"}
          </p>
          {closingNote && <p className={`mt-0.5 ${rejected ? "text-rose-700" : "text-zinc-600"}`}>{closingNote}</p>}
          {at && <p className="mt-1 text-xs text-zinc-500">{formatDateTime(at)}</p>}
        </div>
      </div>
    );
  }

  // ON_HOLD sits between "in progress" and "completed".
  const current = status === "ON_HOLD" ? PROGRESS_STEPS.indexOf("IN_PROGRESS") : PROGRESS_STEPS.indexOf(status);
  const finished = status === "COMPLETED";

  return (
    <ol className="grid grid-cols-4">
      {PROGRESS_STEPS.map((step, i) => {
        const done = i < current || finished;
        const active = i === current && !finished;
        const Icon = STEP_ICON[step] ?? Inbox;
        const at = reachedAt[step];
        return (
          <li key={step} className="relative flex flex-col items-center px-1 text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute top-5 right-1/2 h-0.5 w-full -translate-y-1/2 ${i <= current ? "bg-zinc-900" : "bg-zinc-200"}`}
              />
            )}
            <span
              className={`relative z-10 flex size-10 items-center justify-center rounded-full ring-4 ring-white transition ${
                done
                  ? "bg-zinc-900 text-white"
                  : active
                    ? "bg-brand-600 text-white shadow-[0_0_0_6px_var(--color-brand-100)]"
                    : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {done ? <Check className="size-5" strokeWidth={2.5} /> : <Icon className="size-[18px]" strokeWidth={2} />}
            </span>
            <span
              className={`mt-3 text-xs font-medium sm:text-sm ${active ? "text-brand-700" : done ? "text-zinc-900" : "text-zinc-400"}`}
            >
              {STATUS_LABEL[step]}
            </span>
            {active && status === "ON_HOLD" && (
              <span className="mt-0.5 text-[11px] font-medium text-orange-600">รออะไหล่/พักงาน</span>
            )}
            {at && (done || active) && (
              <span className="mt-0.5 hidden text-[11px] text-zinc-400 sm:block" title={formatDateTime(at)}>
                {timeAgo(at)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
