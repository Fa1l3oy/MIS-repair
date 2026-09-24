import {
  Ban,
  CircleCheck,
  CirclePause,
  CircleX,
  FilePlus2,
  Inbox,
  MessageSquare,
  Star,
  UserCheck,
  UserCog,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ActivityType, RequestStatus, Role } from "@/generated/prisma/enums";
import { timeAgo } from "@/lib/dates";
import { formatDateTime, ROLE_LABEL, STATUS_LABEL } from "@/lib/labels";
import { Avatar } from "./ui/avatar";

export type TimelineActivity = {
  id: string;
  type: ActivityType;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus | null;
  message: string | null;
  createdAt: Date;
  actor: { name: string; role: Role };
};

type Look = { icon: LucideIcon; tone: string };

const STATUS_LOOK: Record<RequestStatus, Look> = {
  PENDING: { icon: Inbox, tone: "bg-sky-50 text-sky-600 ring-sky-600/15" },
  ACCEPTED: { icon: UserCheck, tone: "bg-brand-50 text-brand-600 ring-brand-600/15" },
  IN_PROGRESS: { icon: Wrench, tone: "bg-amber-50 text-amber-600 ring-amber-600/20" },
  ON_HOLD: { icon: CirclePause, tone: "bg-orange-50 text-orange-600 ring-orange-600/20" },
  COMPLETED: { icon: CircleCheck, tone: "bg-emerald-50 text-emerald-600 ring-emerald-600/15" },
  REJECTED: { icon: CircleX, tone: "bg-rose-50 text-rose-600 ring-rose-600/15" },
  CANCELLED: { icon: Ban, tone: "bg-zinc-100 text-zinc-500 ring-zinc-500/15" },
};

function look(a: TimelineActivity): Look {
  switch (a.type) {
    case "CREATED":
      return { icon: FilePlus2, tone: "bg-zinc-100 text-zinc-600 ring-zinc-500/15" };
    case "ASSIGNED":
      return { icon: UserCog, tone: "bg-brand-50 text-brand-600 ring-brand-600/15" };
    case "COMMENT":
      return { icon: MessageSquare, tone: "bg-white text-zinc-500 ring-zinc-500/20" };
    case "RATED":
      return { icon: Star, tone: "bg-amber-50 text-amber-500 ring-amber-600/20" };
    case "STATUS_CHANGED":
      return a.toStatus ? STATUS_LOOK[a.toStatus] : STATUS_LOOK.PENDING;
  }
}

export function activityTitle(a: Pick<TimelineActivity, "type" | "toStatus">) {
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
    <ol className="relative">
      {activities.map((a, i) => {
        const { icon: Icon, tone } = look(a);
        const last = i === activities.length - 1;
        return (
          <li key={a.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && <span aria-hidden className="absolute top-9 bottom-0 left-[17px] w-px bg-zinc-200" />}
            <span className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ${tone}`}>
              <Icon className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-medium text-zinc-900">{activityTitle(a)}</p>
                <time className="text-xs text-zinc-400" dateTime={a.createdAt.toISOString()} title={formatDateTime(a.createdAt)}>
                  {timeAgo(a.createdAt)}
                </time>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                <Avatar name={a.actor.name} size="sm" />
                <span className="truncate">
                  {a.actor.name} · {ROLE_LABEL[a.actor.role]}
                </span>
              </p>
              {a.message && (
                <p className="mt-2 rounded-xl bg-zinc-50 px-3.5 py-2.5 text-sm whitespace-pre-line text-zinc-700 ring-1 ring-zinc-200/60">
                  {a.message}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
