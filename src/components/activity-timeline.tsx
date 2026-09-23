import type { ActivityType, RequestStatus, Role } from "@/generated/prisma/enums";
import { formatDateTime, ROLE_LABEL, STATUS_LABEL } from "@/lib/labels";

export type TimelineActivity = {
  id: string;
  type: ActivityType;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus | null;
  message: string | null;
  createdAt: Date;
  actor: { name: string; role: Role };
};

const ICON: Record<ActivityType, string> = {
  CREATED: "📝",
  STATUS_CHANGED: "🔄",
  ASSIGNED: "👷",
  COMMENT: "💬",
  RATED: "⭐",
};

function title(a: TimelineActivity) {
  switch (a.type) {
    case "CREATED":
      return "แจ้งซ่อม";
    case "ASSIGNED":
      return "มอบหมายงาน";
    case "COMMENT":
      return "แสดงความคิดเห็น";
    case "RATED":
      return "ประเมินความพึงพอใจ";
    case "STATUS_CHANGED":
      return a.toStatus ? `เปลี่ยนสถานะเป็น "${STATUS_LABEL[a.toStatus]}"` : "เปลี่ยนสถานะ";
  }
}

export function ActivityTimeline({ activities }: { activities: TimelineActivity[] }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6">
      {activities.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute top-0 -left-[37px] flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm ring-2 ring-slate-200">
            {ICON[a.type]}
          </span>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-sm font-semibold text-slate-900">{title(a)}</p>
            <time className="text-xs text-slate-400">{formatDateTime(a.createdAt)}</time>
          </div>
          <p className="text-xs text-slate-500">
            โดย {a.actor.name} ({ROLE_LABEL[a.actor.role]})
          </p>
          {a.message && (
            <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm whitespace-pre-line text-slate-700">
              {a.message}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
