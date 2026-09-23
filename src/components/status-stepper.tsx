import type { RequestStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL } from "@/lib/labels";
import { PROGRESS_STEPS } from "@/lib/workflow";

/** Horizontal progress indicator: รอรับเรื่อง → รับเรื่องแล้ว → กำลังดำเนินการ → ซ่อมเสร็จ */
export function StatusStepper({ status }: { status: RequestStatus }) {
  if (status === "REJECTED" || status === "CANCELLED") {
    return (
      <div
        className={`rounded-lg px-4 py-3 text-sm font-medium ${
          status === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
        }`}
      >
        {status === "REJECTED" ? "⛔ งานนี้ไม่สามารถดำเนินการได้" : "🚫 ใบแจ้งซ่อมนี้ถูกยกเลิกแล้ว"}
      </div>
    );
  }

  // ON_HOLD sits between "in progress" and "completed".
  const current = status === "ON_HOLD" ? PROGRESS_STEPS.indexOf("IN_PROGRESS") : PROGRESS_STEPS.indexOf(status);

  return (
    <ol className="flex items-start">
      {PROGRESS_STEPS.map((step, i) => {
        const done = i < current || status === "COMPLETED";
        const active = i === current && status !== "COMPLETED";
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                className={`absolute top-4 right-1/2 -z-0 h-0.5 w-full ${i <= current ? "bg-indigo-500" : "bg-slate-200"}`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ring-4 ring-white ${
                done
                  ? "bg-indigo-600 text-white"
                  : active
                    ? "bg-white text-indigo-700 ring-indigo-100 outline-2 outline-indigo-600"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`mt-2 px-1 text-xs sm:text-sm ${active ? "font-semibold text-indigo-700" : done ? "text-slate-700" : "text-slate-400"}`}
            >
              {STATUS_LABEL[step]}
              {active && status === "ON_HOLD" && <span className="block text-xs text-orange-600">(รออะไหล่/พักงาน)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
