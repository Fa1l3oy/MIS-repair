import type { Priority, RequestStatus, Role } from "@/generated/prisma/enums";
import {
  PRIORITY_DOT,
  PRIORITY_LABEL,
  PRIORITY_STYLE,
  ROLE_LABEL,
  ROLE_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
} from "@/lib/labels";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`badge ${STATUS_STYLE[status]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority, withLabel = false }: { priority: Priority; withLabel?: boolean }) {
  return (
    <span className={`badge ${PRIORITY_STYLE[priority]}`}>
      <span className={`size-1.5 rounded-full ${PRIORITY_DOT[priority]}`} aria-hidden />
      {withLabel && "ความเร่งด่วน: "}
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`badge ${ROLE_STYLE[role]}`}>{ROLE_LABEL[role]}</span>;
}
